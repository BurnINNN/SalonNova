export function TopList({ title, items }: { title: string; items: { name: string; value: string; subValue?: string }[] }) {
  return (
    <div className="p-4 rounded-xl glass-card bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
      <h2 className="text-lg font-semibold mb-4 text-slate-800 dark:text-slate-100">{title}</h2>
      <ul className="space-y-3">
        {items.length === 0 ? (
          <p className="text-slate-500 text-sm">Aucune donnée disponible.</p>
        ) : (
          items.map((item, i) => (
            <li key={i} className="flex justify-between items-center">
              <div>
                <p className="font-medium text-slate-700 dark:text-slate-200">{item.name}</p>
                {item.subValue && <p className="text-xs text-slate-500">{item.subValue}</p>}
              </div>
              <span className="font-semibold text-slate-900 dark:text-white">{item.value}</span>
            </li>
          ))
        )}
      </ul>
    </div>
  )
}
