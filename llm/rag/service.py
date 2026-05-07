from __future__ import annotations

import json
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any, Dict, List, Optional

import chromadb
from chromadb.config import Settings
from openai import OpenAI

from config import Config

from .documents import DocumentChunk, build_document_chunks, compute_documents_fingerprint
from .pricing import estimate_cost

try:
    import posthog

    posthog.disabled = True
    posthog.capture = lambda *args, **kwargs: None  # type: ignore[assignment]
except Exception:
    pass


STATE_FILENAME = "rag_index_state.json"
MAX_BATCH_SIZE = 64


@dataclass
class IndexStatus:
    documents_dir: str
    chroma_dir: str
    collection_name: str
    fingerprint: str
    indexed_fingerprint: str
    indexed_files: int
    indexed_chunks: int
    ready: bool


_openai_client: OpenAI | None = None
_chroma_client: chromadb.PersistentClient | None = None


def _documents_dir() -> Path:
    return Path(Config.RAG_DOCUMENTS_DIR)


def _chroma_dir() -> Path:
    path = Path(Config.RAG_CHROMA_DIR)
    path.mkdir(parents=True, exist_ok=True)
    return path


def _state_path() -> Path:
    return _chroma_dir() / STATE_FILENAME


def _client() -> OpenAI:
    global _openai_client
    if _openai_client is None:
        if not Config.OPENAI_API_KEY:
            raise RuntimeError("OPENAI_API_KEY is not configured")
        client_kwargs: Dict[str, Any] = {"api_key": Config.OPENAI_API_KEY}
        if Config.OPENAI_BASE_URL:
            client_kwargs["base_url"] = Config.OPENAI_BASE_URL
        _openai_client = OpenAI(**client_kwargs)
    return _openai_client


def _chroma() -> chromadb.PersistentClient:
    global _chroma_client
    if _chroma_client is None:
        _chroma_client = chromadb.PersistentClient(
            path=str(_chroma_dir()),
            settings=Settings(anonymized_telemetry=False),
        )
    return _chroma_client


def _collection():
    return _chroma().get_or_create_collection(
        name=Config.RAG_COLLECTION_NAME, metadata={"hnsw:space": "cosine"}
    )


def _load_state() -> Dict[str, Any]:
    path = _state_path()
    if not path.exists():
        return {}
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return {}


def _save_state(state: Dict[str, Any]) -> None:
    _state_path().write_text(json.dumps(state, indent=2), encoding="utf-8")


def _extract_response_text(response: Any) -> str:
    text = getattr(response, "output_text", None)
    if isinstance(text, str) and text.strip():
        return text.strip()

    output = getattr(response, "output", None) or []
    parts: List[str] = []
    for item in output:
        content = getattr(item, "content", None) or []
        for part in content:
            part_text = getattr(part, "text", None)
            if isinstance(part_text, str):
                parts.append(part_text)
    return "\n".join(parts).strip()


def _extract_usage(response: Any) -> Dict[str, int]:
    usage = getattr(response, "usage", None)
    if usage is None:
        return {
            "input_tokens": 0,
            "output_tokens": 0,
            "total_tokens": 0,
            "cached_input_tokens": 0,
        }

    input_tokens = int(getattr(usage, "input_tokens", 0) or 0)
    output_tokens = int(getattr(usage, "output_tokens", 0) or 0)
    total_tokens = int(getattr(usage, "total_tokens", input_tokens + output_tokens) or 0)
    input_details = getattr(usage, "input_tokens_details", None)
    cached_input_tokens = 0
    if input_details is not None:
        cached_input_tokens = int(getattr(input_details, "cached_tokens", 0) or 0)

    return {
        "input_tokens": input_tokens,
        "output_tokens": output_tokens,
        "total_tokens": total_tokens,
        "cached_input_tokens": cached_input_tokens,
    }


def _embedding_texts(texts: List[str], embedding_model: str) -> tuple[List[List[float]], Dict[str, int]]:
    client = _client()
    embeddings: List[List[float]] = []
    total_tokens = 0

    for start in range(0, len(texts), MAX_BATCH_SIZE):
        batch = texts[start : start + MAX_BATCH_SIZE]
        response = client.embeddings.create(model=embedding_model, input=batch)
        embeddings.extend([item.embedding for item in response.data])
        total_tokens += int(getattr(response.usage, "total_tokens", 0) or 0)

    return embeddings, {"embedding_tokens": total_tokens}


def _build_ingest_payload(chunks: List[DocumentChunk]) -> tuple[List[str], List[Dict[str, Any]], List[str]]:
    texts = [chunk.text for chunk in chunks]
    metadatas = [
        {"source": chunk.source, "chunk_index": chunk.chunk_index}
        for chunk in chunks
    ]
    ids = [chunk.id for chunk in chunks]
    return texts, metadatas, ids


def build_or_refresh_index(force: bool = False) -> Dict[str, Any]:
    documents_dir = _documents_dir()
    documents_dir.mkdir(parents=True, exist_ok=True)

    fingerprint = compute_documents_fingerprint(documents_dir)
    state = _load_state()
    collection = _collection()

    if (
        not force
        and state.get("fingerprint") == fingerprint
        and collection.count() > 0
    ):
        return {
            "index_status": get_index_status(),
            "indexing": {"skipped": True, "embedding_tokens": 0, "cost": 0.0},
        }

    chunks = build_document_chunks(
        documents_dir,
        chunk_words=Config.RAG_CHUNK_WORDS,
        overlap_words=Config.RAG_CHUNK_OVERLAP_WORDS,
    )

    try:
        _chroma().delete_collection(Config.RAG_COLLECTION_NAME)
    except Exception:
        pass

    collection = _collection()

    if not chunks:
        _save_state(
            {
                "fingerprint": fingerprint,
                "indexed_fingerprint": fingerprint,
                "indexed_files": 0,
                "indexed_chunks": 0,
                "documents_dir": str(documents_dir),
            }
        )
        return {
            "index_status": get_index_status(),
            "indexing": {"skipped": False, "embedding_tokens": 0, "cost": 0.0},
        }

    texts, metadatas, ids = _build_ingest_payload(chunks)
    embeddings, embedding_usage = _embedding_texts(
        texts, Config.OPENAI_EMBEDDING_MODEL
    )

    collection.add(
        ids=ids,
        documents=texts,
        metadatas=metadatas,
        embeddings=embeddings,
    )

    _save_state(
        {
            "fingerprint": fingerprint,
            "indexed_fingerprint": fingerprint,
            "indexed_files": len({chunk.source for chunk in chunks}),
            "indexed_chunks": len(chunks),
            "documents_dir": str(documents_dir),
            "embedding_usage": embedding_usage,
        }
    )
    indexing_cost = estimate_cost(
        model_name=Config.OPENAI_EMBEDDING_MODEL,
        embedding_model=Config.OPENAI_EMBEDDING_MODEL,
        embedding_tokens=embedding_usage["embedding_tokens"],
    )
    return {
        "index_status": get_index_status(),
        "indexing": {
            "skipped": False,
            "embedding_tokens": embedding_usage["embedding_tokens"],
            "cost": indexing_cost,
        },
    }


def get_index_status() -> Dict[str, Any]:
    documents_dir = _documents_dir()
    fingerprint = compute_documents_fingerprint(documents_dir)
    state = _load_state()
    collection = _collection()
    return asdict(
        IndexStatus(
            documents_dir=str(documents_dir),
            chroma_dir=str(_chroma_dir()),
            collection_name=Config.RAG_COLLECTION_NAME,
            fingerprint=fingerprint,
            indexed_fingerprint=state.get("indexed_fingerprint", ""),
            indexed_files=int(state.get("indexed_files", 0) or 0),
            indexed_chunks=int(state.get("indexed_chunks", 0) or 0),
            ready=collection.count() > 0 and state.get("indexed_fingerprint") == fingerprint,
        )
    )


def retrieve_context(question: str, top_k: Optional[int] = None) -> Dict[str, Any]:
    build_or_refresh_index(force=False)
    collection = _collection()
    if collection.count() == 0:
        return {
            "query_embedding_tokens": 0,
            "retrieved_chunks": [],
            "context": "",
        }

    client = _client()
    query_embedding_response = client.embeddings.create(
        model=Config.OPENAI_EMBEDDING_MODEL, input=question
    )
    query_embedding = query_embedding_response.data[0].embedding
    query_embedding_tokens = int(
        getattr(query_embedding_response.usage, "total_tokens", 0) or 0
    )

    n_results = top_k or Config.RAG_TOP_K
    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=n_results,
        include=["documents", "metadatas", "distances"],
    )

    retrieved: List[Dict[str, Any]] = []
    documents = (results.get("documents") or [[]])[0]
    metadatas = (results.get("metadatas") or [[]])[0]
    distances = (results.get("distances") or [[]])[0]

    for idx, document in enumerate(documents):
        metadata = metadatas[idx] if idx < len(metadatas) else {}
        distance = float(distances[idx]) if idx < len(distances) else 1.0
        similarity = max(0.0, 1.0 - distance)
        retrieved.append(
            {
                "rank": idx + 1,
                "source": metadata.get("source", ""),
                "chunk_index": metadata.get("chunk_index", 0),
                "similarity": round(similarity, 6),
                "text": document,
            }
        )

    context_lines = []
    for item in retrieved:
        context_lines.append(
            f"[Source: {item['source']} | Chunk: {item['chunk_index']} | Similarity: {item['similarity']:.4f}]\n"
            f"{item['text']}"
        )

    return {
        "query_embedding_tokens": query_embedding_tokens,
        "retrieved_chunks": retrieved,
        "context": "\n\n---\n\n".join(context_lines),
    }


def answer_question(
    question: str,
    *,
    model: Optional[str] = None,
    top_k: Optional[int] = None,
) -> Dict[str, Any]:
    if not question or not question.strip():
        raise ValueError("question is required")

    retrieval = retrieve_context(question, top_k=top_k)
    model_name = model or Config.OPENAI_MODEL
    context = retrieval["context"]

    if not retrieval["retrieved_chunks"]:
        return {
            "answer": "I could not find any indexed documents to answer from.",
            "model": model_name,
            "usage": {
                "input_tokens": 0,
                "output_tokens": 0,
                "total_tokens": 0,
                "cached_input_tokens": 0,
            },
            "cost": {
                "llm_input_cost": 0.0,
                "llm_output_cost": 0.0,
                "llm_cached_input_cost": 0.0,
                "embedding_cost": 0.0,
                "total_cost": 0.0,
            },
            "sources": [],
        }

    system_prompt = (
        "You are a retrieval-grounded assistant.\n"
        "Answer only using the provided document context.\n"
        "If the documents do not contain the answer, say you could not find it in the documents.\n"
        "Cite sources inline using the format [source: filename]."
    )

    user_prompt = (
        f"Question:\n{question.strip()}\n\n"
        f"Document context:\n{context}\n\n"
        "Use only the document context above. Do not invent facts."
    )

    response = _client().responses.create(
        model=model_name,
        instructions=system_prompt,
        input=user_prompt,
    )

    answer_text = _extract_response_text(response)
    usage = _extract_usage(response)
    cost = estimate_cost(
        model_name=model_name,
        input_tokens=usage["input_tokens"],
        output_tokens=usage["output_tokens"],
        cached_input_tokens=usage["cached_input_tokens"],
        embedding_model=Config.OPENAI_EMBEDDING_MODEL,
        embedding_tokens=retrieval["query_embedding_tokens"],
    )

    return {
        "answer": answer_text,
        "model": model_name,
        "usage": {
            **usage,
            "query_embedding_tokens": retrieval["query_embedding_tokens"],
        },
        "cost": cost,
        "sources": retrieval["retrieved_chunks"],
    }
