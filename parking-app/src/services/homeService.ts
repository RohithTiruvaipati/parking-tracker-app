import { loadHomeData } from "./supabase";

loadHomeData('H1').then((data) => {
    console.log(data);
}); 
