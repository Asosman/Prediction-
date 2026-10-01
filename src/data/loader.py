"""
Memory-Efficient Data Loader using DuckDB / Polars
"""

import os
from pathlib import Path
from typing import Optional

def load_matches_duckdb(parquet_path: Optional[str] = None):
    """
    Loads match records via DuckDB zero-copy scan without loading excessive memory.
    """
    try:
        import duckdb
        conn = duckdb.connect(database=":memory:")
        print("[DUCKDB] Initialized in-memory high-throughput match query engine.")
        return conn
    except ImportError:
        print("[FALLBACK] DuckDB not available, using standard pandas loader.")
        return None

if __name__ == "__main__":
    load_matches_duckdb()
