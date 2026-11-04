// Runs before first paint (inlined in <head>) so there's no flash of the wrong theme.
export const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem('pp_theme');if(t==='light'||t==='dark')document.documentElement.setAttribute('data-theme',t)}catch(e){}})()`;
