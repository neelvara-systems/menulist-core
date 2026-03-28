import { theme } from 'antd'

export default () => {
    const { token } = theme.useToken();
    return (
        <svg style={{ color: token.colorPrimary }} xmlns="http://www.w3.org/2000/svg" enableBackground="new 0 0 512 512" viewBox="0 0 512 512" width="256" height="256" ><linearGradient id="a" x1="0" x2="512" y1="255" y2="255" gradientTransform="matrix(1 0 0 -1 0 511)" gradientUnits="userSpaceOnUse"><stop offset="0" stopColor="#98e1fd" className="stopColore3e4e6 svgShape"></stop><stop offset="1" stopColor="#638fff" className="stopColor7f8eb8 svgShape"></stop></linearGradient><path fill="url(#a)" d="M0,70.311v256c0,31.419,25.47,56.889,56.889,56.889h113.778l60.943,101.569
		c11.048,18.413,37.733,18.413,48.781,0l60.943-101.569h113.778c31.419,0,56.889-25.47,56.889-56.889v-256
		c0-31.419-25.47-56.889-56.889-56.889H56.889C25.47,13.422,0,38.892,0,70.311z"></path></svg >
    )
};