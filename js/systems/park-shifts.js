// Stylized game ecology, not real attendance data. One deterministic shift
// policy drives every existing character instead of random nightlife spawns.
export function parkShift(hour) {
 const h=((hour%24)+24)%24;
 const overnight=h>=23.5||h<5;
 const dawn=h>=5&&h<7,rush=h>=7&&h<10;
 const day=h>=10&&h<18,evening=h>=18&&h<21,late=h>=21&&h<23.5;
 return {
  walkers:overnight?0:dawn?.2:rush?.7:day?1:evening?.65:late?.22:0,
  sitters:overnight?0:dawn?0:rush?.4:day?1:evening?.55:late?.1:0,
  picnics:h>=10&&h<19,vendor:h>=9&&h<20,
  dogs:overnight?0:dawn?.5:day||rush?1:evening?.75:late?.35:0,
  nightWorker:overnight,
  squirrels:h>=5.5&&h<20,
  rabbits:(h>=5.5&&h<10)||(h>=17.5&&h<21),
  rats:h>=19||h<6.5,
  crows:h>=5.5&&h<20,
 };
}
export function actorVisible(index,total,fraction){
 return Number.isFinite(index)&&index>=0&&total>0&&Number.isFinite(fraction)
  &&(index+.5)/total<=Math.max(0,Math.min(1,fraction));
}
