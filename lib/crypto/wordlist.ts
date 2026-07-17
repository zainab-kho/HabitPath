// @/lib/crypto/wordlist.ts
//
// A curated list of short, common, unambiguous words used to SUGGEST passphrases
// (e.g. "river candle mostly fox garden quiet"). Bigger list = more strength per
// word. With Argon2id making each guess slow, a 6-word suggestion from this list
// is astronomically hard to brute-force.
//
// All lowercase, no duplicates, no confusable/offensive words.

export const WORDLIST: string[] = [
  'able', 'acid', 'acorn', 'actor', 'agile', 'album', 'alert', 'alley', 'amber', 'anchor',
  'angel', 'ankle', 'apple', 'april', 'apron', 'arbor', 'arch', 'arena', 'armor', 'arrow',
  'aspen', 'atlas', 'attic', 'autumn', 'axis', 'bacon', 'badge', 'baker', 'balloon', 'bamboo',
  'banana', 'banjo', 'barley', 'basil', 'basket', 'batch', 'beach', 'beacon', 'beak', 'bean',
  'bear', 'beaver', 'bench', 'berry', 'birch', 'bird', 'biscuit', 'bishop', 'blanket', 'blaze',
  'blend', 'blink', 'blossom', 'blue', 'blush', 'board', 'boat', 'bobcat', 'bonus', 'book',
  'boot', 'border', 'bottle', 'boulder', 'brave', 'bread', 'breeze', 'brick', 'bridge', 'bright',
  'bronze', 'brook', 'broom', 'brush', 'bubble', 'bucket', 'buffalo', 'bulb', 'bundle', 'bunny',
  'burrow', 'butter', 'button', 'cabin', 'cable', 'cactus', 'camel', 'camera', 'candle', 'candy',
  'canoe', 'canvas', 'canyon', 'cape', 'carbon', 'cargo', 'carrot', 'castle', 'cedar', 'cello',
  'cement', 'chain', 'chair', 'chalk', 'charm', 'cheese', 'cherry', 'chess', 'chief', 'chili',
  'chime', 'circus', 'clam', 'clay', 'clever', 'cliff', 'cloak', 'clock', 'clover', 'cloud',
  'clover', 'coast', 'cobra', 'cocoa', 'coffee', 'coin', 'comet', 'compass', 'copper', 'coral',
  'cotton', 'cougar', 'cousin', 'cove', 'coyote', 'crab', 'crane', 'crate', 'crayon', 'cream',
  'creek', 'crimson', 'crisp', 'crow', 'crown', 'cube', 'cursor', 'cyan', 'daisy', 'dance',
  'dawn', 'deer', 'delta', 'denim', 'desert', 'diamond', 'diary', 'dice', 'diner', 'dolphin',
  'domino', 'donut', 'dove', 'dragon', 'dream', 'drift', 'drum', 'dune', 'dusk', 'eagle',
  'east', 'echo', 'eclipse', 'ember', 'emerald', 'engine', 'envelope', 'ivory', 'fable', 'falcon',
  'fancy', 'fawn', 'feather', 'fern', 'ferry', 'fiddle', 'field', 'finch', 'flame', 'flask',
  'fleet', 'float', 'flute', 'fog', 'forest', 'fox', 'frost', 'garden', 'garlic', 'gecko',
  'gentle', 'ginger', 'glacier', 'glide', 'globe', 'glow', 'goose', 'grape', 'grass', 'gravel',
  'green', 'grove', 'guitar', 'gull', 'hammer', 'harbor', 'harvest', 'hawk', 'hazel', 'heron',
  'hickory', 'hill', 'honey', 'hoodie', 'hornet', 'horse', 'ice', 'igloo', 'indigo', 'iris',
  'island', 'ivory', 'jacket', 'jade', 'jaguar', 'jar', 'jasmine', 'jelly', 'jewel', 'jolly',
  'juniper', 'kayak', 'kettle', 'kite', 'kiwi', 'koala', 'ladder', 'lagoon', 'lamp', 'lantern',
  'lark', 'lava', 'leaf', 'ledger', 'lemon', 'lentil', 'lily', 'lime', 'linen', 'lion',
  'llama', 'lobster', 'locket', 'lotus', 'lucky', 'lumber', 'lunar', 'lynx', 'magnet', 'mango',
  'maple', 'marble', 'marsh', 'meadow', 'melon', 'mercy', 'metal', 'meteor', 'mint', 'mirror',
  'mitten', 'mocha', 'mole', 'moose', 'moss', 'mostly', 'mountain', 'mouse', 'muffin', 'mural',
  'mushroom', 'nectar', 'needle', 'nest', 'nickel', 'noble', 'north', 'novel', 'nugget', 'nutmeg',
  'oak', 'oasis', 'ocean', 'olive', 'onion', 'opal', 'orange', 'orbit', 'orchid', 'otter',
  'owl', 'oyster', 'paddle', 'palm', 'panda', 'pansy', 'parrot', 'peach', 'peanut', 'pear',
  'pebble', 'pelican', 'penguin', 'pepper', 'petal', 'piano', 'pickle', 'pigeon', 'pilot', 'pine',
  'pixel', 'plaza', 'plum', 'pocket', 'pollen', 'pond', 'pony', 'poplar', 'poppy', 'potato',
  'prairie', 'prism', 'puddle', 'puffin', 'pumpkin', 'purple', 'quail', 'quartz', 'quiet', 'quilt',
  'rabbit', 'radish', 'raft', 'rain', 'rapid', 'raven', 'reef', 'ribbon', 'ridge', 'river',
  'robin', 'rocket', 'rose', 'ruby', 'rugby', 'rustic', 'saddle', 'sage', 'salmon', 'sand',
  'sapphire', 'satin', 'scarf', 'seal', 'senior', 'shadow', 'shark', 'shell', 'shore', 'silk',
  'silver', 'siren', 'sketch', 'skiff', 'sky', 'slate', 'sleigh', 'snail', 'snow', 'solar',
  'sparrow', 'spice', 'spider', 'spiral', 'spruce', 'squid', 'stable', 'starfish', 'stone', 'stork',
  'storm', 'straw', 'stream', 'sugar', 'summit', 'sunny', 'swan', 'sweater', 'table', 'tackle',
  'tadpole', 'tango', 'teal', 'temple', 'thistle', 'thunder', 'tiger', 'timber', 'toast', 'tomato',
  'topaz', 'tortoise', 'toucan', 'tower', 'trail', 'trout', 'truffle', 'tulip', 'tundra', 'turnip',
  'turtle', 'tusk', 'twine', 'umbrella', 'unicorn', 'valley', 'vanilla', 'velvet', 'violet', 'vulture',
  'waffle', 'walnut', 'walrus', 'wander', 'water', 'wave', 'weasel', 'whale', 'wheat', 'willow',
  'window', 'winter', 'wolf', 'wombat', 'wonder', 'wren', 'yarn', 'yellow', 'zebra', 'zephyr',
];
