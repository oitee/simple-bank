import * as main from "./main.js";


export function parseCommand(str){
    
    if(str && (typeof str) === "string"){
        return str.split(',')
        .map(s => s.trim())
        .filter(s => s.length > 0);
    }
    return null;
}