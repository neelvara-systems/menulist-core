import { theme } from 'antd'

export default () => {
	const { token } = theme.useToken();
	return (
		<svg style={{ color: token.colorPrimary }} xmlns="http://www.w3.org/2000/svg" enableBackground="new 0 0 512 512" viewBox="0 0 512 512" width="256" height="256" ><linearGradient id="a" x1="-62.78" x2="290.336" y1="431.558" y2="78.442" gradientTransform="matrix(1 0 0 -1 0 511)" gradientUnits="userSpaceOnUse"><stop offset="0" stopColor="#abdafb" className="stopColorabdafb svgShape"></stop><stop offset="1" stopColor="#638fff" className="stopColor638fff svgShape"></stop></linearGradient><path fill="url(#a)" d="M227.556,28.444v455.111c0,15.709-12.735,28.444-28.444,28.444H28.444
			C12.735,512,0,499.265,0,483.556V28.444C0,12.735,12.735,0,28.444,0h170.667C214.821,0,227.556,12.735,227.556,28.444z"></path><linearGradient id="b" x1="292.776" x2="503.669" y1="218.224" y2="7.331" gradientTransform="matrix(1 0 0 -1 0 511)" gradientUnits="userSpaceOnUse"><stop offset="0" stopColor="#defcf2" className="stopColordefcf2 svgShape"></stop><stop offset="1" stopColor="#98e1fd" className="stopColor98e1fd svgShape"></stop></linearGradient><path fill="url(#b)" d="M512,312.889v170.667
			C512,499.265,499.265,512,483.556,512H312.889c-15.709,0-28.444-12.735-28.444-28.444V312.889
			c0-15.709,12.735-28.444,28.444-28.444h170.667C499.265,284.444,512,297.18,512,312.889z"></path><linearGradient id="c" x1="292.776" x2="503.669" y1="502.669" y2="291.776" gradientTransform="matrix(1 0 0 -1 0 511)" gradientUnits="userSpaceOnUse"><stop offset="0" stopColor="#defcf2" className="stopColordefcf2 svgShape"></stop><stop offset="1" stopColor="#98e1fd" className="stopColor98e1fd svgShape"></stop></linearGradient><path fill="url(#c)" d="M512,28.444v170.667
			c0,15.71-12.735,28.444-28.444,28.444H312.889c-15.709,0-28.444-12.735-28.444-28.444V28.444C284.444,12.735,297.18,0,312.889,0
			h170.667C499.265,0,512,12.735,512,28.444z"></path></svg >
	)
};