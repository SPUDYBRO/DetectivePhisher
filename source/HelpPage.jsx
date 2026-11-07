// The help page. It only shows text, so it needs no data from the app
export default function HelpPage() {
    return (
        <section className="info-page">
            <h2>Help</h2>
            {/* Steps for a first time user */}
            <h3>How to use DetectivePhisher</h3>
            <ol>
                <li>Go to the home page and paste a link into the box.</li>
                <li>Click the "Check URL" button to analyze the link.</li>
                <li>Review the trust factor results and the phishing report.</li>
            </ol>
        </section>
    )
}