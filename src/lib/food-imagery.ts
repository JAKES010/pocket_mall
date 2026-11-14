const STOCK_FOOD_IMAGES = [
  { terms: /jollof|rice|plantain/, src: "/food/photos/jollof.jpg" },
  { terms: /egusi|soup|yam|pounded/, src: "/food/photos/soup.jpg" },
  { terms: /suya|gizzard|grill|tilapia|fish|chicken/, src: "/food/photos/grill.jpg" },
  { terms: /burger|fries|chips/, src: "/food/photos/burger.jpg" },
  { terms: /zobo|drink|malt|water|juice|shake/, src: "/food/photos/drink.jpg" },
];

const PLACEHOLDER_IMAGE = /^\/food\/(?:rice|suya|chicken|fish|drink|shake|burger|fries|yam|shawarma)\.svg$/i;

export function foodImage(imageUrl: string | null | undefined, description: string) {
  if (imageUrl && !PLACEHOLDER_IMAGE.test(imageUrl)) {
    return { src: imageUrl, illustrative: imageUrl.startsWith("/food/photos/") };
  }

  const stock = STOCK_FOOD_IMAGES.find(({ terms }) => terms.test(description));
  return stock
    ? { src: stock.src, illustrative: true }
    : { src: imageUrl ?? null, illustrative: false };
}
