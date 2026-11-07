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
            {/*Explains each verdict so users know what to do next */}
            <h3>What the results mean</h3>
            <ul>
                <li>Looks Safe: nothing suspicious was found in the link.</li>
                <li>Use Caution: some warning signs were detected, but it may still be safe.</li>
                <li>Likely Phishing: many warning signs were detected. Do not open it.</li>
            </ul>
        </section>
    )
}