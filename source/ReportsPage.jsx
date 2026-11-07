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
                </table>
            )}
        </section>
    )
}