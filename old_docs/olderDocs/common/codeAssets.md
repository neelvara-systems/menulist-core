## Code for saving path as image at save template action

 const saveTemplateToDatabase = async (template = templateDetails) => {

        // const canvasLayers = Promise.all(canvasInstance.current.getObjects().map(async function (obj) {
        //     if (getObjectType(obj) == OBJECT_TYPES.group) {

        //         obj.getObjects().map(async function (cobj) {
        //             if (Boolean(getCustomObjectType(cobj)?.includes(OBJECT_TYPES.drawingTool) && getObjectType(cobj) != OBJECT_TYPES.image)) {
        //                 return await convertPathObjToImageObj(cobj)
        //             } else return obj;
        //         })
        //         return obj;
        //     } else {
        //         if (Boolean(getCustomObjectType(obj)?.includes(OBJECT_TYPES.drawingTool))) {
        //             return await convertPathObjToImageObj(obj)
        //         } else return await obj;
        //     }
        // }))

        // const seriealiseCanvas: any = await canvasLayers;

        // seriealiseCanvas.map((canvasObj, i) => {
        //     let pathObject = canvasInstance.current.getObjects().find((item) => item.uid === canvasObj.uid);
        //     canvasInstance.current.remove(pathObject);
        //     canvasInstance.current.insertAt(canvasObj, i);
        // })

        const templateState = canvasInstance.current.toJSON(CUSTOME_ATTRIBUTES_LIST)
        console.log("templateState", templateState)
        dispatch(toggleLoader(true));
        updateTemplateAndState( template, templateState)
            .then((res) => {
                dispatch(toggleLoader(false));
                console.log("template data updated", res)
                dispatch(showSuccessToast("Template Saved successfuly"))
            })
            .catch((error) => {
                dispatch(toggleLoader(false));
                console.log(error)
                dispatch(showErrorToast("Something went wrong. Please try again later"))
            })
    }