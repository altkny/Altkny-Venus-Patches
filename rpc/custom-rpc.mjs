/**
 * Venus Custom RPC core.
 * Profiles and previews work offline. Discord publication must be implemented
 * by a separately validated activity transport, not simulated by this module.
 */
export const RPC_SCHEMA_VERSION = 1;
export const GAME_PRESETS = Object.freeze([
  {id:"minecraft",name:"Minecraft"},
  {id:"roblox",name:"Roblox"},
  {id:"gtav",name:"Grand Theft Auto V"},
  {id:"valorant",name:"VALORANT"},
  {id:"stardew",name:"Stardew Valley"}
]);
const str=(v,n=128)=>typeof v==="string"?v.trim().slice(0,n):"";
export function normalizeProfile(input={}) {
  const p=input && typeof input==="object"?input:{};
  const buttons=Array.isArray(p.buttons)?p.buttons:[];
  return {
    schemaVersion:RPC_SCHEMA_VERSION,
    id:str(p.id,64)||"custom", name:str(p.name)||"Custom Activity",
    details:str(p.details),state:str(p.state),
    largeImage:str(p.largeImage,256),largeText:str(p.largeText),
    smallImage:str(p.smallImage,256),smallText:str(p.smallText),
    elapsed:p.elapsed===true,
    buttons:buttons.slice(0,2).map(b=>({
      label:str(b?.label,32),url:str(b?.url,2048)
    })).filter(b=>b.label && /^https:\/\/[^\s]+$/i.test(b.url))
  };
}
export function profileFromPreset(id) {
  const game=GAME_PRESETS.find(g=>g.id===id);
  return game?normalizeProfile({id:game.id,name:game.name,elapsed:true}):null;
}
export function renderPreview(profile,startedAt=null,now=Date.now()) {
  const p=normalizeProfile(profile);
  return {
    title:p.name,description:p.details,state:p.state,
    largeImage:p.largeImage,largeText:p.largeText,
    smallImage:p.smallImage,smallText:p.smallText,buttons:p.buttons,
    elapsedSeconds:p.elapsed && Number.isFinite(startedAt) && startedAt<=now
      ?Math.floor((now-startedAt)/1000):null,
    publicationStatus:"preview-only"
  };
}
export function saveProfiles(profiles) {
  return JSON.stringify({schemaVersion:RPC_SCHEMA_VERSION,
    profiles:(Array.isArray(profiles)?profiles:[]).slice(0,100).map(normalizeProfile)});
}
export function loadProfiles(value) {
  try {
    const data=JSON.parse(value);
    return data?.schemaVersion===RPC_SCHEMA_VERSION && Array.isArray(data.profiles)
      ?data.profiles.slice(0,100).map(normalizeProfile):[];
  }catch(_){return [];}
}
