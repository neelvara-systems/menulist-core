import { theme } from "antd";

export default () => {
	const { token } = theme.useToken();
	return (
		<svg style={{ color: token.colorPrimary }} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" >
			<linearGradient id="a" x1="16.663" x2="210.894" y1="494.338" y2="300.107" gradientTransform="matrix(1 0 0 -1 0 511)" gradientUnits="userSpaceOnUse"><stop offset="0" stopColor="#defcf2" className="stopColordefcf2 svgShape"></stop><stop offset="1" stopColor="#98e1fd" className="stopColor98e1fd svgShape"></stop></linearGradient><path fill="url(#a)" d="M170.667,227.556H56.889c-31.419,0-56.889-25.47-56.889-56.889V56.889
			C0.001,25.47,25.471,0,56.889,0h113.778c31.419,0,56.889,25.47,56.889,56.889v113.778
			C227.556,202.086,202.086,227.556,170.667,227.556z"></path><linearGradient id="b" x1="301.106" x2="495.337" y1="494.338" y2="300.107" gradientTransform="matrix(1 0 0 -1 0 511)" gradientUnits="userSpaceOnUse"><stop offset="0" stopColor="#abdafb" className="stopColorabdafb svgShape"></stop><stop offset="1" stopColor="currentColor" className="stopColor638fff svgShape"></stop></linearGradient><path fill="url(#b)" d="M455.111,227.556H341.333
			c-31.419,0-56.889-25.47-56.889-56.889V56.889C284.444,25.47,309.914,0,341.333,0h113.778c31.419,0,56.889,25.47,56.889,56.889
			v113.778C511.999,202.086,486.529,227.556,455.111,227.556z"></path><linearGradient id="c" x1="16.663" x2="210.894" y1="209.893" y2="15.662" gradientTransform="matrix(1 0 0 -1 0 511)" gradientUnits="userSpaceOnUse"><stop offset="0" stopColor="#abdafb" className="stopColorabdafb svgShape"></stop><stop offset="1" stopColor="currentColor" className="stopColor638fff svgShape"></stop></linearGradient><path fill="url(#c)" d="M170.667,512H56.889
			c-31.419,0-56.889-25.47-56.889-56.889V341.333c0-31.419,25.47-56.889,56.889-56.889h113.778c31.419,0,56.889,25.47,56.889,56.889
			v113.778C227.556,486.53,202.086,512,170.667,512z"></path><g fill="#000000" className="color000 svgShape"><linearGradient id="d" x1="301.106" x2="495.337" y1="209.893" y2="15.662" gradientTransform="matrix(1 0 0 -1 0 511)" gradientUnits="userSpaceOnUse"><stop offset="0" stopColor="#defcf2" className="stopColordefcf2 svgShape"></stop><stop offset="1" stopColor="#98e1fd" className="stopColor98e1fd svgShape"></stop></linearGradient><path fill="url(#d)" d="M455.111,512H341.333
			c-31.419,0-56.889-25.47-56.889-56.889V341.333c0-31.419,25.47-56.889,56.889-56.889h113.778c31.419,0,56.889,25.47,56.889,56.889
			v113.778C511.999,486.53,486.529,512,455.111,512z"></path></g></svg>
	);
};