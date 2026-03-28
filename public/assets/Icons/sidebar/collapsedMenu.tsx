import { theme } from 'antd'

export default () => {
	const { token } = theme.useToken();
	return (
		<svg style={{ color: token.colorPrimary }} xmlns="http://www.w3.org/2000/svg" enableBackground="new 0 0 512 512" viewBox="0 0 512 512" width="200" height="200" ><linearGradient id="a" x1="213.333" x2="497.779" y1="255" y2="255" gradientTransform="matrix(1 0 0 -1 0 511)" gradientUnits="userSpaceOnUse"><stop offset="0" stopColor="#c9f7f5" className="stopColorc9f7f5 svgShape"></stop><stop offset="1" stopColor="#638fff" className="stopColor47ebda svgShape"></stop></linearGradient><path fill="url(#a)" d="M469.334,512c-7.278,0-14.556-2.778-20.111-8.33L221.667,276.114
			c-11.111-11.111-11.111-29.118,0-40.229L449.223,8.328c11.111-11.104,29.111-11.104,40.222,0
			c11.111,11.111,11.111,29.118,0,40.229L282,255.999l207.445,207.442c11.111,11.111,11.111,29.118,0,40.229
			C483.89,509.222,476.612,512,469.334,512z"></path><linearGradient id="b" x1="14.222" x2="298.667" y1="255" y2="255" gradientTransform="matrix(1 0 0 -1 0 511)" gradientUnits="userSpaceOnUse"><stop offset="0" stopColor="#e3e4e6" className="stopColore3e4e6 svgShape"></stop><stop offset="1" stopColor="#7f8eb8" className="stopColor7f8eb8 svgShape"></stop></linearGradient><path fill="url(#b)" d="M270.222,512
			c-7.278,0-14.556-2.778-20.111-8.33L22.555,276.114c-11.111-11.111-11.111-29.118,0-40.229L250.111,8.328
			c11.111-11.104,29.111-11.104,40.222,0c11.111,11.111,11.111,29.118,0,40.229L82.888,255.999l207.445,207.442
			c11.111,11.111,11.111,29.118,0,40.229C284.778,509.222,277.5,512,270.222,512z"></path></svg >
	)
};