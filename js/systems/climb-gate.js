// Pure, repeatable tree-climb eligibility. Keep jump velocity in player.js.
// Brief post-jump regrab cooldown prevents launch -> instant trunk grab.
export function mayAttachToTrunk(player, tree, approach) {
  if (!tree || player.climbing || player.climbRegrab > 0) return false;
  if (player.pos.y >= tree.trunkTop - 0.5) return false;
  if (!player.grounded && player.pos.y <= tree.gy + 0.3) return false;
  return approach > (player.grounded ? 0.45 : 0.3);
}
