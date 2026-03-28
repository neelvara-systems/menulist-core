'use client'
import { windowRef } from "./window";

export const setValueInLocalStorage = (key: any, value: any) => {
  type Dict = { [key: string]: string };
  var storage: any;
  let localstorageData: any = window.localStorage.getItem('salon');
  if (localstorageData && localstorageData != '' && localstorageData != 'undefined' && (JSON.parse(localstorageData)) != null) {
    let storeageRef: any = window.localStorage.getItem('salon');
    storage = JSON.parse(storeageRef);
    storage[key] = value;
    window.localStorage.setItem('salon', JSON.stringify(storage))
  } else {
    let object: any = {};
    object[key] = value;
    window.localStorage.setItem('salon', JSON.stringify(object));
  }
}

export const getValueFromLocalStorage = (key: any) => {
  let value = null;
  let storage = window.localStorage.getItem('salon');
  if (storage && storage != '' && storage != 'undefined' && (JSON.parse(storage)) != null) {
    storage = (JSON.parse(storage));
  }
  return (storage && storage[key]) ? storage[key] : null;
}

export const removeItemFromLocalStorage = (key: any) => {
  type Dict = { [key: string]: string };
  var storage: Dict = {};
  let localstorageData: any = window.localStorage.getItem('salon');
  if (storage && localstorageData != '' && localstorageData != 'undefined' && (JSON.parse(localstorageData)) != null) {
    let storeageRef: any = window.localStorage.getItem('salon');
    storage = JSON.parse(storeageRef);
    if (storage[key]) {
      delete storage[key]; localstorageData
      window.localStorage.setItem('salon', JSON.stringify(storage))
    }
  }
}

export const setValueInSessionStorage = (key: any, value: any) => {
  type Dict = { [key: string]: string };
  var storage: Dict = {};
  let sessionStorageData: any = window.localStorage.getItem('salon');
  if (sessionStorageData && sessionStorageData != '' && sessionStorageData != 'undefined' && (JSON.parse(sessionStorageData)) != null) {
    let storeageRef: any = window.localStorage.getItem('salon');
    storage = JSON.parse(storeageRef);
    // storage = (JSON.parse(window.localStorage.getItem('salon')));
    storage[key] = value;
    window.sessionStorage.setItem('salon', JSON.stringify(storage))
  } else {
    let object: any = {};
    object[key] = value;
    window.sessionStorage.setItem('salon', JSON.stringify(object));
  }
}

export const getValueFromSessionStorage = (key: any) => {
  let value = null;
  type Dict = { [key: string]: string };
  var storage: Dict = {};
  let sessionStorageData: any = window.sessionStorage.getItem('salon');
  if (sessionStorageData && sessionStorageData != '' && sessionStorageData != 'undefined' && (JSON.parse(sessionStorageData)) != null) {
    let storeageRef: any = window.localStorage.getItem('salon');
    storage = JSON.parse(storeageRef);
    //  storage = (JSON.parse(window.sessionStorage.getItem('salon')));
  }
  return (storage && storage[key]) ? storage[key] : null;
}

export const removeItemFromSessionStorage = (key: any) => {
  type Dict = { [key: string]: string };
  var storage: Dict = {};
  let sessionStorageData: any = window.sessionStorage.getItem('salon');
  if (sessionStorageData && sessionStorageData != '' && sessionStorageData != 'undefined' && (JSON.parse(sessionStorageData)) != null) {
    let storeageRef: any = window.localStorage.getItem('salon');
    storage = JSON.parse(storeageRef);
    // storage = (JSON.parse(window.sessionStorage.getItem('salon')));
    if (storage[key]) {
      delete storage[key];
      window.sessionStorage.setItem('salon', JSON.stringify(storage))
    }
  }
}

export const setValueInCookies = (key: any, value: any, expDays: any) => {
  if (windowRef) windowRef.document.cookie = key + "=" + value + ';expires=' + expDays + ';path=/';
}

export const getValueFromCookies = (key: any) => {
  if (windowRef) {
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
    return value;
  }
}

export const removeValueFromCookies = (key: any) => {
  // const serialised = serialize(key, "", { //user registration fields
  //   path: "/",
  //   expires: new Date(new Date().setSeconds(1)),
  //   sameSite: true,
  // });
  // document.cookie = serialised;
  // document.cookie = `${key}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
}

