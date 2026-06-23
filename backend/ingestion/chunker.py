"""Split source files into chunks at function/class boundaries using tree-sitter.

Falls back to fixed-line-window chunking for unsupported languages.
"""

import logging
from dataclasses import dataclass
from pathlib import Path

import tree_sitter_python as tspython
import tree_sitter_javascript as tsjs
from tree_sitter import Language, Parser

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Language registry
# ---------------------------------------------------------------------------

_PY_LANG = Language(tspython.language())
_JS_LANG = Language(tsjs.language())

# Maps file extension → (tree-sitter Language, top-level node kinds to chunk on)
_LANG_CONFIG: dict[str, tuple[Language, set[str]]] = {
    '.py':  (_PY_LANG, {'function_definition', 'class_definition'}),
    '.js':  (_JS_LANG, {'function_declaration', 'class_declaration',
                        'arrow_function', 'method_definition'}),
    '.jsx': (_JS_LANG, {'function_declaration', 'class_declaration',
                        'arrow_function', 'method_definition'}),
    '.ts':  (_JS_LANG, {'function_declaration', 'class_declaration',
                        'arrow_function', 'method_definition'}),
    '.tsx': (_JS_LANG, {'function_declaration', 'class_declaration',
                        'arrow_function', 'method_definition'}),
}

# Fallback: lines per chunk for unsupported languages
_FALLBACK_LINES = 60
_FALLBACK_OVERLAP = 10


@dataclass
class Chunk:
    file_path: str    # relative to repo root
    start_line: int   # 1-based
    end_line: int     # 1-based inclusive
    content: str


def chunk_files(files: list[Path], repo_root: Path) -> list[Chunk]:
    """Return a flat list of Chunks across all *files*."""
    chunks: list[Chunk] = []
    for path in files:
        try:
            file_chunks = _chunk_file(path, repo_root)
            chunks.extend(file_chunks)
        except Exception:
            logger.warning("Skipping %s (parse error)", path, exc_info=True)
    logger.info("Produced %d chunks from %d files", len(chunks), len(files))
    return chunks


def _chunk_file(path: Path, repo_root: Path) -> list[Chunk]:
    rel_path = str(path.relative_to(repo_root))
    source = path.read_bytes()
    ext = path.suffix.lower()

    if ext in _LANG_CONFIG:
        return _tree_sitter_chunks(source, rel_path, ext)
    return _fallback_chunks(source, rel_path)


def _tree_sitter_chunks(source: bytes, rel_path: str, ext: str) -> list[Chunk]:
    lang, node_kinds = _LANG_CONFIG[ext]
    parser = Parser(lang)
    tree = parser.parse(source)
    lines = source.decode('utf-8', errors='replace').splitlines()

    chunks: list[Chunk] = []
    _walk(tree.root_node, node_kinds, lines, rel_path, chunks)

    # If the parser found no top-level nodes, fall back
    if not chunks:
        return _fallback_chunks(source, rel_path)
    return chunks


def _walk(node, node_kinds: set[str], lines: list[str], rel_path: str, out: list[Chunk]) -> None:
    if node.type in node_kinds:
        start = node.start_point[0]   # 0-based row
        end = node.end_point[0]       # 0-based row
        content = '\n'.join(lines[start:end + 1])
        out.append(Chunk(
            file_path=rel_path,
            start_line=start + 1,
            end_line=end + 1,
            content=content,
        ))
        return  # don't recurse into matched node — avoids nested duplicates

    for child in node.children:
        _walk(child, node_kinds, lines, rel_path, out)


def _fallback_chunks(source: bytes, rel_path: str) -> list[Chunk]:
    lines = source.decode('utf-8', errors='replace').splitlines()
    chunks: list[Chunk] = []
    i = 0
    while i < len(lines):
        end = min(i + _FALLBACK_LINES, len(lines))
        content = '\n'.join(lines[i:end])
        chunks.append(Chunk(
            file_path=rel_path,
            start_line=i + 1,
            end_line=end,
            content=content,
        ))
        i += _FALLBACK_LINES - _FALLBACK_OVERLAP
    return chunks
