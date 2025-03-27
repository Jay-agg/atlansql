import React, {
  useEffect,
  useState,
  useMemo,
  useCallback,
  Suspense,
  lazy,
  useRef,
} from "react";
import products from "./data/products.json";
import {
  ArrowDownTrayIcon,
  BookmarkIcon,
  TableCellsIcon,
  StarIcon as OutlineStarIcon,
  XMarkIcon,
  ArrowsPointingOutIcon,
} from "@heroicons/react/24/outline";
import { StarIcon as SolidStarIcon } from "@heroicons/react/24/solid";

const LazyBar = lazy(() =>
  import("react-chartjs-2").then((module) => ({ default: module.Bar }))
);
const LazyScatter = lazy(() =>
  import("react-chartjs-2").then((module) => ({ default: module.Scatter }))
);
const LazyLine = lazy(() =>
  import("react-chartjs-2").then((module) => ({ default: module.Line }))
);
const LazyRadar = lazy(() =>
  import("react-chartjs-2").then((module) => ({ default: module.Radar }))
);

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  RadarController,
  RadialLinearScale,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import "./App.css";
import VirtualizedTable from "./components/VirtualizedTable";

function App() {
  useEffect(() => {
    ChartJS.register(
      CategoryScale,
      LinearScale,
      BarElement,
      LineElement,
      PointElement,
      RadarController,
      RadialLinearScale,
      Title,
      Tooltip,
      Legend,
      Filler
    );
  }, []);

  const predefinedQueries = useMemo(
    () => [
      {
        id: 1,
        name: "Get all products",
        sql: "SELECT * FROM products;",
        data: products,
      },
      {
        id: 2,
        name: "Get discontinued products",
        sql: "SELECT * FROM products WHERE discontinued = 1;",
        data: products.filter((p) => p.discontinued === 1),
      },
      {
        id: 3,
        name: "Get expensive products",
        sql: "SELECT * FROM products WHERE unitPrice > 50;",
        data: products.filter((p) => p.unitPrice > 50),
      },
    ],
    []
  );

  const tableSchema = useMemo(
    () => [
      { column: "productID", type: "number", sample: "1" },
      { column: "productName", type: "string", sample: "Chai" },
      { column: "supplierID", type: "number", sample: "1" },
      { column: "categoryID", type: "number", sample: "1" },
      {
        column: "quantityPerUnit",
        type: "string",
        sample: "10 boxes x 20 bags",
      },
      { column: "unitPrice", type: "number", sample: "18.00" },
      { column: "unitsInStock", type: "number", sample: "39" },
      { column: "unitsOnOrder", type: "number", sample: "0" },
      { column: "reorderLevel", type: "number", sample: "10" },
      { column: "discontinued", type: "boolean", sample: "0" },
    ],
    []
  );

  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [savedQueries, setSavedQueries] = useState([]);
  const [queryHistory, setQueryHistory] = useState([]);
  const [schemaVisible, setSchemaVisible] = useState(false);
  const [fullWidth, setFullWidth] = useState(false);
  const [viewMode, setViewMode] = useState("table");
  const [chartType, setChartType] = useState("bar");
  const [queryCache, setQueryCache] = useState({});

  // Add useRef for the query editor textarea
  const queryEditorRef = useRef(null);

  const handleRunQuery = useCallback(() => {
    if (queryCache[query]) {
      setResults(queryCache[query]);
      return;
    }

    const matchedQuery = predefinedQueries.find((q) => q.sql === query.trim());
    const queryResults = matchedQuery ? matchedQuery.data : products;

    setQueryHistory((prev) => [query, ...prev.slice(0, 9)]);

    setQueryCache((prev) => ({
      ...prev,
      [query]: queryResults,
    }));

    if (!matchedQuery) {
      setSavedQueries((prev) => {
        const updated = [...new Set([query, ...prev])];
        localStorage.setItem("savedQueries", JSON.stringify(updated));
        return updated;
      });
    }

    setResults(queryResults);
  }, [query, queryCache, products, predefinedQueries]);

  useEffect(() => {
    const savedQueriesFromStorage = localStorage.getItem("savedQueries");
    if (savedQueriesFromStorage) {
      try {
        setSavedQueries(JSON.parse(savedQueriesFromStorage));
      } catch (error) {
        console.error("Error parsing saved queries", error);
      }
    }
  }, []);

  // Add useEffect to handle the cmd + enter shortcut
  useEffect(() => {
    const handleKeyDown = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
        event.preventDefault(); // Prevent newline in textarea
        handleRunQuery();
      }
    };

    const editor = queryEditorRef.current;
    if (editor) {
      editor.addEventListener("keydown", handleKeyDown);
    }

    // Cleanup event listener on unmount
    return () => {
      if (editor) {
        editor.removeEventListener("keydown", handleKeyDown);
      }
    };
  }, [handleRunQuery]);

  const chartDataGenerators = useMemo(
    () => ({
      bar: (results) => ({
        labels: results.map((product) => product.productName),
        datasets: [
          {
            label: "Unit Price",
            data: results.map((product) => product.unitPrice),
            backgroundColor: "rgba(75, 192, 192, 0.6)",
          },
        ],
      }),
      scatter: (results) => ({
        datasets: [
          {
            label: "Unit Price vs Units in Stock",
            data: results.map((product) => ({
              x: product.unitsInStock,
              y: product.unitPrice,
            })),
            backgroundColor: "rgba(75, 192, 192, 0.6)",
          },
        ],
      }),
      area: (results) => ({
        labels: results.map((product) => product.productName),
        datasets: [
          {
            label: "Unit Price",
            data: results.map((product) => product.unitPrice),
            fill: true,
            backgroundColor: "rgba(75, 192, 192, 0.2)",
            borderColor: "rgba(75, 192, 192, 1)",
          },
        ],
      }),
      radar: (results) => ({
        labels: ["Unit Price", "Units in Stock", "Units on Order"],
        datasets: results.slice(0, 3).map((product) => ({
          label: product.productName,
          data: [product.unitPrice, product.unitsInStock, product.unitsOnOrder],
          backgroundColor: "rgba(75, 192, 192, 0.2)",
          borderColor: "rgba(75, 192, 192, 1)",
          fill: true,
        })),
      }),
    }),
    []
  );

  const toggleSavedQuery = useCallback((q) => {
    setSavedQueries((prev) => {
      const updated = prev.includes(q)
        ? prev.filter((sq) => sq !== q)
        : [...prev, q];
      localStorage.setItem("savedQueries", JSON.stringify(updated));
      return updated;
    });
  }, []);

  const paginatedResults = useMemo(() => {
    return results.slice(0, 100);
  }, [results]);

  // Define the export function
  const handleExport = () => {
    if (results.length === 0) {
      return; // Do nothing if there are no results
    }

    // Get headers from the first result object
    const headers = Object.keys(results[0]);
    const headerRow = headers.join(",");

    // Convert each row to CSV format
    const rows = results.map((row) =>
      headers
        .map((header) => {
          let value = row[header];
          if (value == null) value = "";
          value = String(value);
          // Escape special characters for CSV
          if (
            value.includes(",") ||
            value.includes('"') ||
            value.includes("\n")
          ) {
            value = `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        })
        .join(",")
    );

    // Combine header and rows into CSV content
    const csvContent = [headerRow, ...rows].join("\n");

    // Create a downloadable file
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "query_results.csv");
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderChart = useCallback(() => {
    const chartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 0 },
    };

    const chartData = chartDataGenerators[chartType](results);

    const chartComponents = {
      bar: LazyBar,
      scatter: LazyScatter,
      area: LazyLine,
      radar: LazyRadar,
    };

    const ChartComponent = chartComponents[chartType];

    return (
      <Suspense fallback={<div>Loading Chart...</div>}>
        <ChartComponent data={chartData} options={chartOptions} />
      </Suspense>
    );
  }, [chartType, chartDataGenerators, results]);

  return (
    <div className="app-container">
      <div className={`schema-panel ${schemaVisible ? "visible" : ""}`}>
        <div className="schema-content">
          <div className="schema-header">
            <h2 className="schema-title">Table Schema</h2>
            <button
              onClick={() => setSchemaVisible(false)}
              className="icon-btn"
            >
              <XMarkIcon className="icon" />
            </button>
          </div>
          <div className="schema-body">
            <div className="schema-grid">
              {tableSchema.map((col) => (
                <div key={col.column} className="schema-item">
                  <div className="font-mono font-medium">{col.column}</div>
                  <div className="text-muted text-xs">{col.type}</div>
                  <div className="text-subtle text-xs">
                    Sample: {col.sample}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className={fullWidth ? "full-screen" : ""}>
        <header className="header">
          <div className="header-content">
            <h1 className="header-title">Atlan Submission</h1>
            <div className="header-actions">
              <button
                onClick={() => setFullWidth(!fullWidth)}
                className="btn-secondary"
              >
                <ArrowsPointingOutIcon className="icon-small" />
                {fullWidth ? "Exit Full Screen" : "Full Screen"}
              </button>
              <button
                onClick={() => setSchemaVisible(true)}
                className="btn-secondary"
              >
                <TableCellsIcon className="icon-small" />
                Schema
              </button>
            </div>
          </div>
        </header>

        {!fullWidth && (
          <div className="main-grid">
            <div className="sidebar">
              <div className="card">
                <h3 className="card-title">
                  <BookmarkIcon className="icon-small" />
                  Quick Filters
                </h3>
                <div className="filter-list">
                  <button
                    onClick={() => setQuery(predefinedQueries[0].sql)}
                    className="filter-btn"
                  >
                    All Products
                  </button>
                  <button
                    onClick={() => setQuery(predefinedQueries[1].sql)}
                    className="filter-btn"
                  >
                    Discontinued Products
                  </button>
                  <button
                    onClick={() => setQuery(predefinedQueries[2].sql)}
                    className="filter-btn"
                  >
                    High Price Items
                  </button>
                </div>
              </div>
              <div className="card">
                <h3 className="card-title">
                  <SolidStarIcon className="icon-small" />
                  Saved Queries
                </h3>
                <div className="saved-query-list">
                  {savedQueries.map((q, i) => (
                    <div key={i} className="saved-query">
                      <button
                        onClick={() => setQuery(q)}
                        className="saved-query-btn"
                      >
                        {q.split(" ").slice(0, 4).join(" ")}...
                      </button>
                      <button
                        onClick={() => toggleSavedQuery(q)}
                        className="star-btn"
                      >
                        {savedQueries.includes(q) ? (
                          <SolidStarIcon className="icon-small text-yellow" />
                        ) : (
                          <OutlineStarIcon className="icon-small text-yellow" />
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="main-content">
              <div className="card">
                <div className="editor-header">
                  <h3 className="font-medium">Query Editor</h3>
                  <div className="editor-actions">
                    <button onClick={handleRunQuery} className="btn-primary">
                      Run (⌘+Enter)
                    </button>
                    <button
                      onClick={() => setQuery("")}
                      className="btn-secondary"
                    >
                      Clear
                    </button>
                  </div>
                </div>
                <textarea
                  ref={queryEditorRef} // Attach ref to textarea
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="-- Enter your SQL query here\nSELECT * FROM products;"
                  className="query-editor"
                />
              </div>
            </div>
          </div>
        )}

        <div className={`results-wrapper ${fullWidth ? "full-width" : ""}`}>
          <div className="results-inner">
            <div className="results-header">
              <div className="results-controls">
                <h3 className="font-medium">
                  Results ({results.length.toLocaleString()} rows)
                </h3>
                <button
                  onClick={() => setViewMode("table")}
                  className={`view-btn ${viewMode === "table" ? "active" : ""}`}
                >
                  Table
                </button>
                <button
                  onClick={() => setViewMode("chart")}
                  className={`view-btn ${viewMode === "chart" ? "active" : ""}`}
                >
                  Chart
                </button>
                {viewMode === "chart" && (
                  <div className="chart-type-selector">
                    <button
                      onClick={() => setChartType("bar")}
                      className={`chart-type-btn ${
                        chartType === "bar" ? "active" : ""
                      }`}
                    >
                      Bar
                    </button>
                    <button
                      onClick={() => setChartType("scatter")}
                      className={`chart-type-btn ${
                        chartType === "scatter" ? "active" : ""
                      }`}
                    >
                      Scatter
                    </button>
                    <button
                      onClick={() => setChartType("area")}
                      className={`chart-type-btn ${
                        chartType === "area" ? "active" : ""
                      }`}
                    >
                      Area
                    </button>
                    <button
                      onClick={() => setChartType("radar")}
                      className={`chart-type-btn ${
                        chartType === "radar" ? "active" : ""
                      }`}
                    >
                      Radar
                    </button>
                  </div>
                )}
                {!fullWidth && (
                  <button
                    onClick={() => setFullWidth(true)}
                    className="btn-secondary"
                  >
                    <ArrowsPointingOutIcon className="icon-small" />
                    Expand
                  </button>
                )}
              </div>
              <div className="results-actions">
                <button
                  onClick={handleExport} // Add export handler
                  className="btn-secondary"
                  disabled={results.length === 0} // Disable if no results
                >
                  <ArrowDownTrayIcon className="icon-small" />
                  Export
                </button>
              </div>
            </div>

            {results.length > 0 ? (
              <div className="results-content">
                {viewMode === "table" ? (
                  <VirtualizedTable
                    data={paginatedResults}
                    fullWidth={fullWidth}
                  />
                ) : (
                  <div className="chart-container">{renderChart()}</div>
                )}
              </div>
            ) : (
              <div className="no-results">Run a query to see results</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
