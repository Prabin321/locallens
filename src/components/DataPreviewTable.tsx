import { useState, useMemo } from 'react'
import type { ColumnProfile } from '../types/dataset'

interface DataPreviewTableProps {
  headers: string[]
  columns: ColumnProfile[]
  rows: Record<string, string | number | boolean | null>[]
}

export function DataPreviewTable({ headers, columns, rows }: DataPreviewTableProps) {
  const [filterText, setFilterText] = useState('')
  const [pageSize, setPageSize] = useState(10)
  const [currentPage, setCurrentPage] = useState(1)

  const columnTypeMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const col of columns) {
      map.set(col.name, col.type)
    }
    return map
  }, [columns])

  const filteredRows = useMemo(() => {
    if (!filterText.trim()) return rows

    const q = filterText.toLowerCase()
    return rows.filter((row) =>
      headers.some((h) => {
        const val = row[h]
        return val !== null && String(val).toLowerCase().includes(q)
      }),
    )
  }, [rows, headers, filterText])

  const totalPages = Math.ceil(filteredRows.length / pageSize) || 1
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredRows.slice(start, start + pageSize)
  }, [filteredRows, currentPage, pageSize])

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage)
    }
  }

  const getTypeIcon = (type: string | undefined) => {
    switch (type) {
      case 'number':
        return '#'
      case 'boolean':
        return '✓'
      case 'date':
        return '📅'
      default:
        return 'Aa'
    }
  }

  return (
    <div
      style={{
        marginTop: '2rem',
        borderRadius: '16px',
        backgroundColor: 'rgba(255, 255, 255, 0.025)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        padding: '1.25rem',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.15)',
      }}
    >
      {/* Table header controls */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '1rem',
          marginBottom: '1rem',
        }}
      >
        <div>
          <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: '#f8fafc' }}>
            Interactive Raw Data Preview
          </h3>
          <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
            Displaying {filteredRows.length} of {rows.length} loaded preview rows
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <input
            type="text"
            placeholder="Search within preview..."
            value={filterText}
            onChange={(e) => {
              setFilterText(e.target.value)
              setCurrentPage(1)
            }}
            style={{
              padding: '0.4rem 0.8rem',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              backgroundColor: 'rgba(0, 0, 0, 0.3)',
              color: '#f8fafc',
              fontSize: '0.82rem',
              outline: 'none',
              minWidth: '200px',
            }}
          />

          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value))
              setCurrentPage(1)
            }}
            style={{
              padding: '0.4rem 0.65rem',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              backgroundColor: '#1e293b',
              color: '#f8fafc',
              fontSize: '0.82rem',
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            <option value={10}>10 per page</option>
            <option value={25}>25 per page</option>
            <option value={50}>50 per page</option>
          </select>
        </div>
      </div>

      {/* Table container with horizontal scroll */}
      <div
        style={{
          overflowX: 'auto',
          borderRadius: '10px',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          backgroundColor: 'rgba(0, 0, 0, 0.2)',
        }}
      >
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '0.82rem',
            textAlign: 'left',
          }}
        >
          <thead>
            <tr style={{ backgroundColor: 'rgba(255, 255, 255, 0.04)', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
              <th
                style={{
                  padding: '0.65rem 0.85rem',
                  color: '#64748b',
                  width: '50px',
                  fontWeight: 600,
                  fontSize: '0.72rem',
                }}
              >
                #
              </th>
              {headers.map((h) => {
                const type = columnTypeMap.get(h)
                return (
                  <th
                    key={h}
                    style={{
                      padding: '0.65rem 0.85rem',
                      color: '#e2e8f0',
                      fontWeight: 600,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <span
                      style={{
                        marginRight: '0.4rem',
                        fontSize: '0.7rem',
                        opacity: 0.6,
                        fontFamily: 'monospace',
                      }}
                    >
                      {getTypeIcon(type)}
                    </span>
                    {h}
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {paginatedRows.length === 0 ? (
              <tr>
                <td
                  colSpan={headers.length + 1}
                  style={{
                    padding: '2rem',
                    textAlign: 'center',
                    color: '#94a3b8',
                  }}
                >
                  No matching rows found in preview.
                </td>
              </tr>
            ) : (
              paginatedRows.map((row, rowIdx) => {
                const actualRowNumber = (currentPage - 1) * pageSize + rowIdx + 1
                return (
                  <tr
                    key={rowIdx}
                    style={{
                      borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                      transition: 'background 0.1s ease',
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.03)')
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.backgroundColor = 'transparent')
                    }
                  >
                    <td
                      style={{
                        padding: '0.55rem 0.85rem',
                        color: '#64748b',
                        fontFamily: 'monospace',
                        fontSize: '0.75rem',
                      }}
                    >
                      {actualRowNumber}
                    </td>
                    {headers.map((h) => {
                      const val = row[h]
                      const isNull = val === null || val === undefined

                      return (
                        <td
                          key={h}
                          style={{
                            padding: '0.55rem 0.85rem',
                            color: isNull ? '#f59e0b' : '#f1f5f9',
                            whiteSpace: 'nowrap',
                            maxWidth: '240px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {isNull ? (
                            <span
                              style={{
                                fontStyle: 'italic',
                                opacity: 0.75,
                                fontSize: '0.72rem',
                                backgroundColor: 'rgba(245, 158, 11, 0.1)',
                                padding: '0.1rem 0.35rem',
                                borderRadius: '4px',
                              }}
                            >
                              null
                            </span>
                          ) : (
                            String(val)
                          )}
                        </td>
                      )
                    })}
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination controls */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: '1rem',
          fontSize: '0.8rem',
          color: '#94a3b8',
        }}
      >
        <span>
          Page {currentPage} of {totalPages}
        </span>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            type="button"
            disabled={currentPage <= 1}
            onClick={() => handlePageChange(currentPage - 1)}
            style={{
              padding: '0.35rem 0.75rem',
              borderRadius: '6px',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              color: '#f8fafc',
              cursor: currentPage <= 1 ? 'not-allowed' : 'pointer',
              opacity: currentPage <= 1 ? 0.4 : 1,
            }}
          >
            ← Previous
          </button>
          <button
            type="button"
            disabled={currentPage >= totalPages}
            onClick={() => handlePageChange(currentPage + 1)}
            style={{
              padding: '0.35rem 0.75rem',
              borderRadius: '6px',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              color: '#f8fafc',
              cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer',
              opacity: currentPage >= totalPages ? 0.4 : 1,
            }}
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  )
}
