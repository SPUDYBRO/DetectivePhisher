// The help page. It only shows text, so it needs no data from the app
export default function HelpPage() {
    return (
        <section className="info-page">
            <h2 className="page-title">Help</h2>
            {/* Each topic grouped in the same white card style as the home page's result cards */}
            <div className="info-card">
                <h3>How to use DetectivePhisher</h3>
                <ol>
                    <li>Go to the home page and paste a link into the box.</li>
                    <li>Click the "Check Link" button to analyze the link.</li>
                    <li>Review the verdict banner, then look through the Phishing Probability, Confidence, Report, Feature Comparison, and History cards for more detail.</li>
                </ol>
            </div>
            <div className="info-card">
                <h3>What the results mean</h3>
                <ul>
                    <li>Looks Safe: nothing suspicious was found in the link.</li>
                    <li>Likely Phishing: warning signs were detected. Do not open it.</li>
                </ul>
            </div>
            <div className="info-card">
                <h3>Limits of this tool</h3>
                <p>
                    DetectivePhisher only looks at how the link is written. It does not
                    open the website. A result is a risk indicator, not a guarantee, so
                    stay careful even when a link looks safe.
                </p>
            </div>
        </section>
    )
}