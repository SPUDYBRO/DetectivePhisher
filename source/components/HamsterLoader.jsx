// Shared "hamster running in a wheel" loading animation (from Uiverse.io by
// Nawsome). Used as the empty-state placeholder on the reports page, and as a
// short loading indicator on the home page while a URL check is in flight.
export default function HamsterLoader({ message }) {
    return (
        <div className="hamster-loader">
            {message && <p className="results-placeholder">{message}</p>}
            <div aria-label="Orange and tan hamster running in a metal wheel" role="img" className="wheel-and-hamster">
                <div className="wheel"></div>
                <div className="hamster">
                    <div className="hamster__body">
                        <div className="hamster__head">
                            <div className="hamster__ear"></div>
                            <div className="hamster__eye"></div>
                            <div className="hamster__nose"></div>
                        </div>
                        <div className="hamster__limb hamster__limb--fr"></div>
                        <div className="hamster__limb hamster__limb--fl"></div>
                        <div className="hamster__limb hamster__limb--br"></div>
                        <div className="hamster__limb hamster__limb--bl"></div>
                        <div className="hamster__tail"></div>
                    </div>
                </div>
                <div className="spoke"></div>
            </div>
        </div>
    )
}
