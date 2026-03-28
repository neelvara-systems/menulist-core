import React, { useState } from "react";
/**
* Custom hook to retrieve and store cookies for our application.
* @param {String} key The key to store our data to
* @param {String} defaultValue The default value to return in case the cookie doesn't exist
*/
const useCookie = (key, defaultValue) => {
    const getCookie = () => getItem(key) || defaultValue;
    const [cookie, setCookie] = useState(getCookie());
    const updateCookie = (value, numberOfDays) => {
        setCookie(value);
        setItem(key, value, numberOfDays);
    };
    return [cookie, updateCookie];
};
export default useCookie;

const setItem = (key, value, numberOfDays) => {
    const now = new Date();
    now.setTime(now.getTime() + (numberOfDays * 60 * 60 * 24 * 1000));
    document.cookie = `${key}=${JSON.stringify(value)}; expires=${now.toUTCString()}; path=/`;
};

const getItem = (key) => {
    let value: any = null;
    var name = key + "=";
    var decodedCookie = decodeURIComponent(window.document.cookie);
    var ca = decodedCookie.split(';');
    ca && ca.map((dataString) => {
        //remove spaces from string at starting
        while (dataString.charAt(0) == ' ') {
            dataString = dataString.substring(1);
        }
        if (dataString.indexOf(name) == 0) {
            value = dataString.substring(name.length, dataString.length);
        }
    })
    return value ? JSON.parse(value) : '';
}
