import { assertPublicLanguage, noRainAllDay, rainFreeBefore, rainWindow, temperatureDrop, temperatureStory, thunderstormWindow, uncertaintyAfter, windWindow } from "../src/engine/editorial";
const eq=(a:string,e:string)=>{if(a!==e)throw new Error(`Expected "${e}", got "${a}"`);assertPublicLanguage(a);};
eq(temperatureStory(20,28,15),"20° ce matin, jusqu’à 28° cet après-midi.");
eq(noRainAllDay(),"Pas de pluie aujourd’hui.");
eq(rainFreeBefore(18),"Pas de pluie avant 18 h.");
eq(rainWindow(18,20),"Pluie entre 18 h et 20 h.");
eq(rainWindow(14,18,"normal",true),"Pluie par moments entre 14 h et 18 h.");
eq(rainWindow(17,19,"strong"),"Forte pluie entre 17 h et 19 h.");
eq(thunderstormWindow(18,21),"Orages entre 18 h et 21 h.");
eq(uncertaintyAfter(18),"Après 18 h, les prévisions sont incertaines.");
eq(windWindow(14,19,63),"Vent fort entre 14 h et 19 h, jusqu’à 65 km/h.");
eq(temperatureDrop(16,29,21,21),"29° à 16 h, 21° à 21 h.");
for(const bad of ["Averses marquées en fin de journée.","Risque orageux ce soir.","Précipitations importantes.","Plus frais ce matin."]){let rejected=false;try{assertPublicLanguage(bad)}catch{rejected=true}if(!rejected)throw new Error(`Forbidden wording accepted: ${bad}`)}
console.log("LOKA editorial V0.3.1: tests OK");
