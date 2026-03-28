import { theme } from 'antd'

export default () => {
    const { token } = theme.useToken();
    return (
        <svg style={{ color: token.colorPrimary }} xmlns="http://www.w3.org/2000/svg" enableBackground="new 0 0 512 512" viewBox="0 0 512 512" width="256" height="256" ><linearGradient id="a" x1="0" x2="512" y1="255" y2="255" gradientTransform="matrix(1 0 0 -1 0 511)" gradientUnits="userSpaceOnUse"><stop offset="0" stopColor="#638fff" className="stopColore3e4e6 svgShape"></stop><stop offset="1" stopColor="#638fff" className="stopColor7f8eb8 svgShape"></stop></linearGradient><path fill="url(#a)" d="M455.111,455.111H56.889C25.47,455.111,0,429.641,0,398.222V113.778
			c0-31.419,25.47-56.889,56.889-56.889h398.222c31.419,0,56.889,25.47,56.889,56.889v284.444
			C512,429.641,486.53,455.111,455.111,455.111z"></path><linearGradient id="b" x1="18.778" x2="492.945" y1="338.2" y2="338.2" gradientTransform="matrix(1 0 0 -1 0 511)" gradientUnits="userSpaceOnUse"><stop offset="0" stopColor="#c9f7f5" className="stopColorc9f7f5 svgShape"></stop><stop offset="1" stopColor="#98e1fd" className="stopColor47ebda svgShape"></stop></linearGradient><path fill="url(#b)" d="M492.945,71.681L296.674,271.639
			c-22.465,22.764-58.882,22.764-81.347,0L18.778,71.681c9.951-9.389,23.319-14.792,38.111-14.792h398.222
			C469.618,56.889,482.986,62.292,492.945,71.681z"></path></svg >
    )
};