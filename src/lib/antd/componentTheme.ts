const antdComponentTheme = (token) => {
    return {
        Menu: {
            itemSelectedBg: "unset"
        },
        Segmented: {
            fontSize: 14,              // Increased from 12
            fontSizeLG: 15,            // Increased from 13  
            controlHeight: 32,         // Increased from 28
            controlHeightLG: 40,       // Added for large size
            borderRadiusXS: 4,
            controlPaddingHorizontalSM: 10
        },
        Button: {
            contentFontSize: 13,
            // colorBorder: "transperant"
        },
        Drawer: {
            padding: 10,
            paddingLG: 15
        },
        Collapse: {
            // headerBg: token.colorBgLayout
        },
        // Typography: {
        //     // fontFamilyCode: '--primary-font'
        // },
        Dropdown: {
            fontSize: 14
        },
        Switch: {
            handleSize: 18,            // Refined from 20
            trackHeight: 24,           // Refined from 30
            trackMinWidth: 48,         // Refined from 60
            trackPadding: 3           // Refined from 5
        },
        Splitter: {
            splitBarSize: 4,
            splitBarDraggableSize: 80,
        }
    }
}
export default antdComponentTheme;
