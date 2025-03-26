import { useRef, useState, useEffect } from "react";
import { FixedSizeList as List } from "react-window";

function VirtualizedTable({ data, fullWidth }) {
  const columns = [
    "productID",
    "productName",
    "supplierID",
    "categoryID",
    "quantityPerUnit",
    "unitPrice",
    "unitsInStock",
    "unitsOnOrder",
    "reorderLevel",
    "discontinued",
  ];

  const columnConfig = {
    productID: { width: 100, align: "text-left" },
    productName: { width: 300, align: "text-left" },
    supplierID: { width: 120, align: "text-right" },
    categoryID: { width: 120, align: "text-right" },
    quantityPerUnit: { width: 220, align: "text-left" },
    unitPrice: { width: 120, align: "text-right" },
    unitsInStock: { width: 120, align: "text-right" },
    unitsOnOrder: { width: 140, align: "text-right" },
    reorderLevel: { width: 140, align: "text-right" },
    discontinued: { width: 120, align: "text-center" },
  };

  const totalWidth = columns.reduce(
    (sum, col) => sum + columnConfig[col].width,
    0
  );

  const tableRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const updateDimensions = () => {
      if (tableRef.current) {
        const rect = tableRef.current.getBoundingClientRect();
        setDimensions({
          width: rect.width,
          height: fullWidth ? window.innerHeight - 160 : 500,
        });
      }
    };

    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, [fullWidth]);

  const formatColumnValue = (value, column) => String(value);

  return (
    <div
      ref={tableRef}
      className={`table-container ${fullWidth ? "full-height" : ""}`}
    >
      <div style={{ width: totalWidth, minWidth: "100%" }}>
        <div
          className="table-header"
          style={{
            display: "grid",
            gridTemplateColumns: columns
              .map((col) => `${columnConfig[col].width}px`)
              .join(" "),
          }}
        >
          {columns.map((col) => (
            <div
              key={col}
              className={`table-header-cell ${columnConfig[col].align}`}
            >
              {col.replace(/([A-Z])/g, " $1").trim()}
            </div>
          ))}
        </div>

        <List
          height={dimensions.height - 48}
          itemCount={data.length}
          itemSize={40}
          width={totalWidth}
          style={{ overflowX: "hidden" }}
        >
          {({ index, style }) => (
            <div
              className="table-row"
              style={{
                ...style,
                display: "grid",
                gridTemplateColumns: columns
                  .map((col) => `${columnConfig[col].width}px`)
                  .join(" "),
              }}
            >
              {columns.map((col) => (
                <div
                  key={col}
                  className={`table-cell ${columnConfig[col].align}`}
                  title={String(data[index][col])}
                >
                  {formatColumnValue(data[index][col], col)}
                </div>
              ))}
            </div>
          )}
        </List>
      </div>
    </div>
  );
}

export default VirtualizedTable;
