import { theme } from 'antd'

export default () => {
    const { token } = theme.useToken();
    return (
        <svg style={{ color: token.colorPrimary }} xmlns="http://www.w3.org/2000/svg" enableBackground="new 0 0 512 512" viewBox="0 0 512 512" width="256" height="256" >
            <linearGradient id="a" x1="120.471" x2="391.529" y1="375.471" y2="375.471" gradientTransform="matrix(1 0 0 -1 0 511)" gradientUnits="userSpaceOnUse">
                <stop offset="0" stopColor="#638fff" className="stopColore3e4e6 svgShape">
                </stop>
                <stop offset="1" stopColor="#7aa6fe" className="stopColor7f8eb8 svgShape">
                </stop>
            </linearGradient>
            <circle cx="256" cy="135.5" r="135.5" fill="url(#a)">
            </circle>
            <linearGradient id="b" x1="45.176" x2="466.824" y1="89.353" y2="89.353" gradientTransform="matrix(1 0 0 -1 0 511)" gradientUnits="userSpaceOnUse">
                <stop offset="0" stopColor="#c9f7f5" className="stopColorc9f7f5 svgShape">
                </stop>
                <stop offset="1" stopColor="#638fff" className="stopColor47ebda svgShape">
                </stop>
            </linearGradient>
            <path fill="url(#b)" d="M 406.6 512 H 105.4 c -33.3 0 -60.2 -27 -60.2 -60.2 v 0 c 0 -66.5 53.9 -120.5 120.5 -120.5 h 180.7 c 66.5 0 120.5 53.9 120.5 120.5 v 0 C 466.8 485 439.9 512 406.6 512 z">
            </path>
        </svg >
    )
};