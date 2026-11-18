// Pure, repeatable tree-climb eligibility. Keep jump velocity in player.js.
// Brief post-jump regrab cooldown prevents launch -> instant trunk grab.
// A tree-top dismount only succeeds if an actual elevated walk surface is
// present. Without this rule, the legacy surface query can fall back to lawn
// and instantly teleport a squirrel from 6–10 metres high to ground level.
export function mayTransferToCanopy(climbFeetY, supportY, canopyY) {
  return Number.isFinite(climbFeetY) && Number.isFinite(supportY) &&
    Number.isFinite(canopyY) && supportY >= canopyY - 1.0 &&
    supportY <= climbFeetY + 1.6;
}

export function mayAttachToTrunk(player, tree, approach) {
  if (!tree || player.climbing || player.climbRegrab > 0) return false;
  if (player.pos.y >= tree.trunkTop - 0.5) return false;
  if (!player.grounded && player.pos.y <= tree.gy + 0.3) return false;
  return approach > (player.grounded ? 0.45 : 0.3);
}
