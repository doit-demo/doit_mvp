export type LocationReading={latitude:number;longitude:number;accuracy:number;location_recorded_at:string};
export function collectLocation(onChange:(value:LocationReading|null)=>void,provider:Pick<Geolocation,'getCurrentPosition'>):Promise<LocationReading>{
 onChange(null);
 return new Promise((resolve,reject)=>{if(!provider){reject(new Error('이 브라우저에서 위치 기능을 사용할 수 없습니다.'));return;}provider.getCurrentPosition(position=>{const value={latitude:position.coords.latitude,longitude:position.coords.longitude,accuracy:position.coords.accuracy,location_recorded_at:new Date(position.timestamp).toISOString()};onChange(value);resolve(value);},()=>{onChange(null);reject(new Error('위치 권한과 HTTPS 연결을 확인해 주세요. 이전 위치는 삭제되었습니다.'));},{enableHighAccuracy:true,timeout:15000,maximumAge:0});});
}
