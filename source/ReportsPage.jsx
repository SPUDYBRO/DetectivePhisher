import TrustBarChart from './TrustBarChart.jsx'

// CHANGED (1): keys match the backend's two verdicts
const VERDICT_LABELS = {
  legitimate: 'Looks Safe',
  phishing: 'Likely Phishing'
}

// Shows every url checked this session. The history list is passed in from App.jsx
export default function ReportsPage({ history }) {
    return (
        <section className="info-page">
            <h2>Reports</h2>
            {/* Second chart, answers a different question to the trust circle on the home page */}
            {history.length > 0 && (
                <>
                    <h3>How do my checks compare?</h3>
                    <TrustBarChart history={history} />
                </>
            )}
            {history.length === 0 && <p>No URLs checked yet this session.</p>}
            {history.length > 0 && (
                <table className="reports-table">
                <thead>
                    <tr>
                    <th scope="col">URL</th>
                    <th scope="col">Result</th>
                    <th scope="col">Phishing probability</th>
                    <th scope="col">Confidence</th>
                    <th scope="col">Checked at</th>
                    </tr>
                </thead>
                <tbody>
                    {history.map((entry, index) => (
                    <tr key={index}>
                        <td>{entry.url}</td>
                        <td>{VERDICT_LABELS[entry.verdict] ?? entry.verdict}</td>
                        {/* CHANGED (3): camelCase, to match the name saved in App.jsx */}
                        <td>{Math.round(entry.phishingProbability * 100)}%</td>
                        <td>{Math.round(entry.confidence * 100)}%</td>
                        <td>{entry.checkedAt}</td>
                    </tr>
                    ))}
                </tbody>
                </table>
            )}
        </section>
    )
}