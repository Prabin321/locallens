import { useState, useMemo } from 'react'
import { ColumnProfileCard } from './ColumnProfileCard'
import type { ColumnProfile, ColumnType } from '../types/dataset'

interface ColumnProfileListProps {
  columns: ColumnProfile[]
}

export function ColumnProfileList({ columns }: ColumnProfileListProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedType, setSelectedType] = useState<ColumnType | 'all'>('all')
  const [sortBy, setSortBy] = useState<'index' | 'name' | 'missing' | 'unique'>('index')

  const filteredAndSortedColumns = useMemo(() => {
    let result = columns.filter((col) => {
      const matchesSearch = col.name.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesType = selectedType === 'all' || col.type === selectedType
      return matchesSearch && matchesType
    })

    if (sortBy === 'name') {
      result = [...result].sort((a, b) => a.name.localeCompare(b.name))
    } else if (sortBy === 'missing') {
      result = [...result].sort((a, b) => b.nullPercentage - a.nullPercentage)
    } else if (sortBy === 'unique') {
      result = [...result].sort((a, b) => b.uniqueCount - a.uniqueCount)
    }

    return result
  }, [columns, searchQuery, selectedType, sortBy])

  return (
    <div style={{ marginTop: '2rem' }}>
      {/* Control bar */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '1rem',
          marginBottom: '1.25rem',
        }}
      >
        <div>
          <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: '#f8fafc' }}>
            Column Profiles ({filteredAndSortedColumns.length} of {columns.length})
          </h3>
          <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.82rem', color: '#94a3b8' }}>
            Detailed statistics, distribution charts, and null detection per attribute
          </p>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.65rem' }}>
          {/* Search box */}
          <input
            type="text"
            placeholder="Search columns..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              padding: '0.45rem 0.85rem',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              backgroundColor: 'rgba(0, 0, 0, 0.3)',
              color: '#f8fafc',
              fontSize: '0.85rem',
              outline: 'none',
              minWidth: '180px',
            }}
          />

          {/* Type filter */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value as ColumnType | 'all')}
            style={{
              padding: '0.45rem 0.85rem',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              backgroundColor: '#1e293b',
              color: '#f8fafc',
              fontSize: '0.85rem',
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            <option value="all">All Types</option>
            <option value="number">Numerical Only</option>
            <option value="string">Categorical Only</option>
            <option value="boolean">Boolean Only</option>
            <option value="date">Date Only</option>
          </select>

          {/* Sort selector */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'index' | 'name' | 'missing' | 'unique')}
            style={{
              padding: '0.45rem 0.85rem',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              backgroundColor: '#1e293b',
              color: '#f8fafc',
              fontSize: '0.85rem',
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            <option value="index">Default Order</option>
            <option value="missing">Highest Missing %</option>
            <option value="name">Name (A-Z)</option>
            <option value="unique">Most Unique Values</option>
          </select>
        </div>
      </div>

      {/* Grid of Column Profiles */}
      {filteredAndSortedColumns.length === 0 ? (
        <div
          style={{
            padding: '3rem',
            textAlign: 'center',
            borderRadius: '12px',
            border: '1px dashed rgba(255, 255, 255, 0.1)',
            color: '#94a3b8',
          }}
        >
          No columns match your current search or type filter.
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '1.25rem',
          }}
        >
          {filteredAndSortedColumns.map((col) => (
            <ColumnProfileCard key={col.name} column={col} />
          ))}
        </div>
      )}
    </div>
  )
}
