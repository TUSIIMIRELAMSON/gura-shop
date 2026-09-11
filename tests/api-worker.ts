export {env} from 'cloudflare:workers';
import {GET,POST,PATCH,DELETE} from '../app/api/[...path]/route';
export default {fetch(request:Request){return ({GET,POST,PATCH,DELETE} as any)[request.method](request);}};
