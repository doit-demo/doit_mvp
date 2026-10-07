export class ApiError extends Error { status:number; constructor(status:number,message:string){super(message);this.status=status;} }
export function fail(status:number,message:string):never {throw new ApiError(status,message);}
export function json(data:unknown,status=200,extra:Record<string,string>={}){return new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff',...extra}});}
export async function boundedBody(request:Request,max:number){
 if(Number(request.headers.get('content-length')||0)>max)fail(413,'파일 또는 요청이 너무 큽니다.');
 const reader=request.body?.getReader();if(!reader)return new Uint8Array();
 const chunks:Uint8Array[]=[];let length=0;
 while(true){const {done,value}=await reader.read();if(done)break;length+=value.length;if(length>max){await reader.cancel();fail(413,'파일 또는 요청이 너무 큽니다.');}chunks.push(value);}
 const data=new Uint8Array(length);let offset=0;for(const chunk of chunks){data.set(chunk,offset);offset+=chunk.length;}return data;
}
export async function bodyJSON(request:Request):Promise<Record<string,unknown>>{try{const value=JSON.parse(new TextDecoder().decode(await boundedBody(request,32768)));if(!value||typeof value!=='object'||Array.isArray(value))fail(422,'JSON 객체가 필요합니다.');return value;}catch(e){if(e instanceof ApiError)throw e;fail(422,'올바른 JSON이 필요합니다.');}}
export function textField(value:unknown,name:string,max=4000,required=true):string {if(typeof value!=='string'||value.trim().length>max||(required&&!value.trim()))fail(422,`${name} 입력을 확인해 주세요.`);return value.trim();}
export function coordinate(value:unknown,max:number):number{if(typeof value!=='number'||!Number.isFinite(value)||Math.abs(value)>max)fail(422,'좌표 범위가 올바르지 않습니다.');return value;}
