import { Component } from 'react';

// Catches crashes while the page is drawing and shows a message instead of a blank screen.
// React only supports this as a class, there is no hook for it.
export default class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false }
    }

    //React calls this when something inside crashes
    static getDerivedStateFromError(error) {
        return { hasError: true }
    }

    render() {
        if (this.state.hasError) {
            return (
                <section className="info-page" role="alert">
                    <h2>Something went wrong</h2>
                    <p>The page ran into a problem. Reload to try again.</p>
                    <button type="button" className="info-page-button" onClick={() => window.location.reload()}>
                        Reload the page
                    </button>
                </section>
            )
        }
        return this.props.children
    }
}