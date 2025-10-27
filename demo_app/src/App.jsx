import React, { useEffect, useState, useRef } from "react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "bootstrap/dist/css/bootstrap.min.css"; 

export default function App() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [numFound, setNumFound] = useState(0);
  const [favorites, setFavorites] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("bf:favs") || "[]");
    } catch {
      return [];
    }
  });

  const controllerRef = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    localStorage.setItem("bf:favs", JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setNumFound(0);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchResults(query, page);
    }, 350);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (controllerRef.current) controllerRef.current.abort();
    };
  }, [query, page]);

  async function fetchResults(q, p = 1) {
    try {
      if (controllerRef.current) controllerRef.current.abort();
      controllerRef.current = new AbortController();
      const offset = (p - 1) * 20;
      const url = `https://openlibrary.org/search.json?title=${encodeURIComponent(
        q
      )}&limit=20&offset=${offset}`;

      const res = await fetch(url, { signal: controllerRef.current.signal });
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const data = await res.json();
      setResults(data.docs || []);
      setNumFound(data.numFound || 0);
      setLoading(false);
    } catch (err) {
      if (err.name === "AbortError") return;
      toast.error(err.message || "Something went wrong fetching data");
      setError(err.message || "Unknown error");
      setLoading(false);
    }
  }

  function coverUrl(doc) {
    if (doc.cover_i)
      return `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`;
    if (doc.isbn && doc.isbn.length)
      return `https://covers.openlibrary.org/b/isbn/${doc.isbn[0]}-M.jpg`;
    return null;
  }

  function toggleFavorite(book) {
    setFavorites((prev) => {
      const exists = prev.find((b) => b.key === book.key);
      if (exists) {
        toast.info("Removed from favorites",{ toastId: "remove-favorite" });
        return prev.filter((b) => b.key !== book.key);
      } else {
        toast.success("Added to favorites!",{ toastId: "add-favorite" });
        return [book, ...prev].slice(0, 100);
      }
    });
  }



  function isFavorite(book) {
    return favorites.some((b) => b.key === book.key);
  }

  function onSearchSubmit(e) {
    e && e.preventDefault();
    setPage(1);
  }

  return (
    <div className="bg-light text-dark min-vh-100 p-3">
 <ToastContainer
  position="top-right"
  theme="colored"
  autoClose={2000}
  limit={3}  // Number of toasts shown at once
  newestOnTop={true}  // Show latest toast on top
/>
      <div className="container">
        {/* Header */}
        <header className="d-flex flex-column flex-sm-row align-items-center justify-content-between mb-4 gap-2">
          <h1 className="text-primary fw-bold"><i class="fa-solid fa-book"></i> BookFinder</h1>
          <p className="text-secondary small mb-0">
            Search powered by Open Library
          </p>
        </header>

        {/* Search bar */}
        <form onSubmit={onSearchSubmit} className="d-flex gap-2 mb-4">
          <input
            aria-label="Search books by title"
            className="form-control flex-grow-1"
            placeholder="Search books by title (e.g., 'Dune', 'Emma')"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button type="submit" className="btn btn-primary px-4">
            Search
          </button>
        </form>

        <div className="row g-4">
          {/* Results Section */}
          <section className="col-md-8 bg-white rounded shadow-sm p-3">
            <h2 className="text-primary mb-3">Results</h2>

            {loading && <div>Loading…</div>}
            {error && <div className="text-danger">{error}</div>}

            {!loading && !error && !results.length && query.trim() && (
              <div className="text-muted">No results found — try another title.</div>
            )}

            {!query.trim() && (
              <div className="text-muted">Start typing to search books by title.</div>
            )}

            <ul className="list-unstyled">
              {results.map((doc) => (
                <li
                  key={doc.key}
                  className="d-flex align-items-center gap-3 border-bottom pb-3 mb-3"
                >
                  <div
                    className="bg-light rounded d-flex align-items-center justify-content-center overflow-hidden"
                    style={{ width: 64, height: 80 }}
                  >
                    {coverUrl(doc) ? (
                      <img
                        src={coverUrl(doc)}
                        alt={`${doc.title} cover`}
                        className="img-fluid rounded"
                        style={{ maxHeight: "100%", maxWidth: "100%" }}
                      />
                    ) : (
                      <span className="text-muted small">No cover</span>
                    )}
                  </div>
                  <div className="flex-grow-1">
                    <div className="d-flex justify-content-between align-items-start">
                      <div>
                        <div className="fw-semibold h5 mb-1">{doc.title}</div>
                        <div className="text-muted small">
                          {(doc.author_name || []).slice(0, 3).join(", ")}{" "}
                          {doc.first_publish_year ? `• ${doc.first_publish_year}` : ""}
                        </div>
                      </div>
                      <button
                        onClick={() =>
                          toggleFavorite({
                            key: doc.key,
                            title: doc.title,
                            author_name: doc.author_name,
                            cover_i: doc.cover_i,
                          })
                        }
                        className="btn btn-link p-0 fs-3"
                        style={{ color: isFavorite(doc) ? "#ffc107" : "#6c757d" }}
                        aria-label={isFavorite(doc) ? "Remove from favorites" : "Add to favorites"}
                        title={isFavorite(doc) ? "Remove from favorites" : "Add to favorites"}
                      >
                        {isFavorite(doc) ? "★" : "☆"}
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          {/* Favorites Section */}
          <aside className="col-md-4 bg-white rounded shadow-sm p-3">
            <h3 className="text-primary mb-3">Favorites</h3>
            {!favorites.length && (
              <div className="text-muted small">No favorites yet. Click ★ to save.</div>
            )}
            <ul className="list-unstyled">
              {favorites.map((f) => (
                <li
                  key={f.key}
                  className="d-flex align-items-center gap-3 border-bottom pb-2 mb-2"
                >
                  <div
                    className="bg-light rounded overflow-hidden d-flex align-items-center justify-content-center"
                    style={{ width: 40, height: 56 }}
                  >
                    {f.cover_i ? (
                      <img
                        src={`https://covers.openlibrary.org/b/id/${f.cover_i}-S.jpg`}
                        alt="fav cover"
                        className="img-fluid rounded"
                        style={{ maxHeight: "100%", maxWidth: "100%" }}
                      />
                    ) : (
                      <span className="text-muted small">No</span>
                    )}
                  </div>
                  <div className="flex-grow-1 small">
                    <div className="fw-semibold">{f.title}</div>
                    <div className="text-muted">
                      {(f.author_name || []).slice(0, 1).join(", ")}
                    </div>
                  </div>
                  <button
                    onClick={() => toggleFavorite(f)}
                    className="btn btn-link p-0 small text-danger"
                    aria-label="Remove from favorites"
                    title="Remove from favorites"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          </aside>
        </div>
      </div>
    </div>
  );
}
