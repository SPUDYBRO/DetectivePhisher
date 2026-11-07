// Same labels as App.jsx, so the verdict is worded the same on every page
const VERDICT_LABELS = {
  benign: 'Looks Safe',
  caution: 'Use Caution',
  malicious: 'Likely Phishing',
}
// Shows every url checked this session. The history list is passed in from App.jsx
export default function ReportsPage({ history }) {
    return (
        <section className="info-page">
            <h2>Reports</h2>
            {/* Show a message when nothing has been checked yet */}
            {history.length === 0 && <p>No URLs checked yet this session.</p>}
            {/* Table only shows once there is something to list */}
            {history.length > 0 && (
                <table className="reports-table">
                <thead>
                    <tr>
                    <th>URL</th>
                    <th>Result</th>
                    <th>Trust</th>
                    <th>Checked at</th>
                    </tr>
                </thead>
                <tbody>
                    {/* One row for each past check. The url is printed as plain text,
                        so React escapes it and it can never run as code */}
                    {history.map((entry, index) => (
                    <tr key={index}>
                        <td>{entry.url}</td>
                        <td>{VERDICT_LABELS[entry.verdict] ?? entry.verdict}</td>
                        <td>{Math.round(entry.trustScore * 100)}%</td>
                        <td>{entry.checkedAt}</td>
                    </tr>
                    ))}
                </tbody>
                </table>
            )}
        </section>
    )
}