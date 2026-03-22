import React from 'react';

/**
 * Table reutilizable.
 * props:
 * - data: array de objetos
 * - columns: array de { key, header, render? }
 * - rowKey: función opcional para generar la key de cada fila
 */
export function Table({ data, columns, rowKey }) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr>
          {columns.map((col) => (
            <th key={col.key} style={styles.th}>
              {col.header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.map((row, idx) => (
          <tr key={rowKey ? rowKey(row) : idx}>
            {columns.map((col) => (
              <td key={col.key} style={styles.td}>
                {col.render ? col.render(row) : (row[col.key] ?? '')}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const styles = {
  th: { textAlign: 'left', padding: '8px', borderBottom: '1px solid #ddd' },
  td: { padding: '8px', borderBottom: '1px solid #eee' },
};

export default Table;
