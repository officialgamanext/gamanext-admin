import { useState } from 'react';
import './Table.css';

const PAGE_SIZE = 32;

export default function Table({ columns, data, emptyText = 'No records found.' }) {
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState([]);

  const totalPages = Math.ceil(data.length / PAGE_SIZE);
  const paginated = data.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const allChecked = paginated.length > 0 && paginated.every(row => selected.includes(row.id));

  const toggleAll = () => {
    if (allChecked) {
      setSelected(prev => prev.filter(id => !paginated.some(r => r.id === id)));
    } else {
      setSelected(prev => [...new Set([...prev, ...paginated.map(r => r.id)])]);
    }
  };

  const toggleRow = (id) => {
    setSelected(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <div className="table-wrapper">
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th className="col-check">
                <input
                  type="checkbox"
                  className="table-checkbox"
                  checked={allChecked}
                  onChange={toggleAll}
                />
              </th>
              {columns.map(col => (
                <th key={col.key} style={col.style || {}}>
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={columns.length + 1}>
                  <div className="table-empty">
                    <div className="table-empty-icon">📋</div>
                    <p>{emptyText}</p>
                  </div>
                </td>
              </tr>
            ) : (
              paginated.map(row => (
                <tr key={row.id}>
                  <td>
                    <input
                      type="checkbox"
                      className="table-checkbox"
                      checked={selected.includes(row.id)}
                      onChange={() => toggleRow(row.id)}
                    />
                  </td>
                  {columns.map(col => (
                    <td key={col.key}>
                      {col.render ? col.render(row[col.key], row) : row[col.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {data.length > 0 && (
        <div className="table-pagination">
          <span className="table-pagination-info">
            Showing {Math.min((page - 1) * PAGE_SIZE + 1, data.length)}–{Math.min(page * PAGE_SIZE, data.length)} of {data.length}
          </span>
          <div className="table-pagination-btns">
            <button
              className="table-pagination-btn"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              ‹
            </button>
            {pages.map(p => (
              <button
                key={p}
                className={`table-pagination-btn${page === p ? ' active' : ''}`}
                onClick={() => setPage(p)}
              >
                {p}
              </button>
            ))}
            <button
              className="table-pagination-btn"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              ›
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
