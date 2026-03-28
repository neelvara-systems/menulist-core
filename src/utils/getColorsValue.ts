
type gradientConfigObj = {
    type: string,
    props: any,
    colors: any[]
}

export const getGradientValue = (configObj: gradientConfigObj) => {
    const colors = configObj.colors;
    let { direction, type } = configObj.props;
    if (type.includes("radial")) {
        type = 'radial'
    };
    let colorsString = '';
    colors.map((c, i) => {
        colorsString = `${colorsString}${c}${i != colors.length - 1 ? ', ' : ''}`
    })
    // console.log("configObj.props", configObj.props)
    return (`${type}-gradient(${direction}, ${colorsString})`);
}


export const getStyleValueAndType = (propertyValue: any) => {
    let value: any = 0;
    let type: any = "px";
    if (Boolean(propertyValue)) {
        if (`${propertyValue}`?.includes("%")) {
            type = "%";
            value = propertyValue.split("%")[0];
        } else if (propertyValue?.includes("px")) {
            type = "px";
            value = propertyValue.split("px")[0];
        }
    }

    return { value, type }
}