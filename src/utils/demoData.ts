import type { BrochureSetup, POIRecord } from '../types'

/**
 * Generate a placeholder image blob with text overlay
 */
export async function createPlaceholderImage(
  text: string,
  color: string,
  width = 400,
  height = 300
): Promise<Blob> {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!

  // Background
  ctx.fillStyle = color
  ctx.fillRect(0, 0, width, height)

  // Text
  ctx.fillStyle = 'white'
  ctx.font = 'bold 32px Arial'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, width / 2, height / 2)

  return new Promise<Blob>((resolve) => {
    canvas.toBlob((blob) => resolve(blob!), 'image/jpeg', 0.9)
  })
}

/**
 * Sample Irish heritage stories
 * POIs 1-4: 100 words each
 * POIs 5-8: 50 words each
 */
const sampleStories = [
  // 100 words - Bronze Age Burnt Mound
  'This Bronze Age burnt mound dates to approximately 2000 BC and represents one of the earliest traces of human activity in this area. Archaeological surveys have identified heat-shattered stones and charcoal-rich soil indicating intensive cooking activities. The site likely functioned as a communal gathering place where water was heated using hot stones dropped into wooden troughs. This cooking method was common across Bronze Age Ireland. Local tradition suggests this was a seasonal meeting point for extended family groups who would gather here during important occasions. The mound itself accumulated over centuries of repeated use, creating the distinctive horseshoe shape visible today. Such sites provide invaluable insights into prehistoric daily life and social practices.',
  
  // 100 words - Medieval Parish Church
  'The medieval parish church ruins visible here date to the 13th century, though documentary evidence suggests an earlier wooden structure occupied this site. The west gable features remarkable stone carvings that have been documented by the National Monuments Service, including fine examples of Gothic window tracery. Local historians have traced continuous use of this site for worship spanning over 800 years, making it one of the most significant ecclesiastical sites in the region. The church served a large rural parish until the construction of a new church in the village during the 1850s. The graveyard surrounding the ruins remains in active use and contains headstones dating from the 1600s onwards, providing a rich genealogical resource.',
  
  // 100 words - Holy Well
  'This holy well has been a place of pilgrimage since early Christian times, possibly as early as the 6th century. The stone surround dates to the late 1700s when the site was formally renovated, though the well itself is considerably older. Pattern days were traditionally held here on the feast of the patron saint each August, attracting pilgrims from across the region who would walk barefoot around the well while reciting prayers. The water was believed to have curative properties, particularly for eye ailments and skin conditions. Local folklore preserves numerous accounts of miraculous healings attributed to the well. Though the pattern days have ceased, the site remains a place of quiet reflection and prayer.',
  
  // 100 words - Victorian Estate Gates
  'These magnificent wrought iron gates were commissioned by the local landlord family in the 1880s during the height of Victorian prosperity. The exceptional craftsmanship displays typical Victorian attention to decorative detail, with elaborate scrollwork patterns and the family crest prominently displayed at the center. The gates were forged by a renowned Dublin ironworks firm whose work can be found at several grand estates throughout Ireland. Similar gates once stood at other estate entrances throughout the county, though few remain in such remarkably good condition. The estate itself was divided and sold during land reform in the early 20th century, but these gates survive as a testament to the skilled craftspeople of that era.',
  
  // 50 words - Stone Bridge
  'The stone bridge crossing this stream dates to the early 1800s and formed part of the new road network established during that period. Built using local limestone, the single-arch design has proven remarkably durable. The bridge connected remote farming communities to the market town.',
  
  // 50 words - Vernacular Cottage
  'This vernacular thatched cottage represents a once-common building type that has now become rare. The thick stone walls and small windows reflect practical responses to the Irish climate. This house was continuously occupied by the same family for five generations until the 1970s.',
  
  // 50 words - Penal Mass Rock
  'The mass rock concealed in this sheltered location served the local Catholic community during the Penal Laws era of the 1700s. When public Catholic worship was forbidden, Mass was celebrated outdoors at hidden locations. The rock formation provided both altar and protection.',
  
  // 50 words - Lime Kiln
  'This lime kiln is one of several built across the parish in the 1800s to produce quicklime for agricultural improvement. Limestone was burned at high temperatures for several days, then the resulting lime was spread on fields to reduce soil acidity.',
]

/**
 * Generate demo BrochureSetup with placeholder data
 */
export async function generateDemoBrochureSetup(): Promise<BrochureSetup> {
  const coverPhoto = await createPlaceholderImage('DEMO TRAIL', '#3a9b8e', 800, 1200)
  
  const logo1 = await createPlaceholderImage('LOGO 1', '#4a5568', 200, 200)
  const logo2 = await createPlaceholderImage('LOGO 2', '#718096', 200, 200)

  return {
    id: 'demo',
    trailId: 'demo',
    coverTitle: 'Sample Heritage Trail',
    coverPhotoBlob: coverPhoto,
    groupName: 'Demo Tidy Towns 2024',
    creditsText: `This demonstration brochure has been created by The Memory Trail team to showcase the digital heritage trail format.\n\nAcknowledgements: Local historians, community volunteers, and heritage enthusiasts who contribute to preserving our shared heritage.\n\nFunding support provided by heritage councils and community development programmes.`,
    introText: 'Welcome to this demonstration heritage trail. This sample brochure showcases how communities can document and share their local heritage using The Memory Trail app. Each Point of Interest represents a significant site in the local landscape, from ancient monuments to more recent historical features. Together, these sites tell the story of human activity and settlement patterns spanning thousands of years.',
    funderLogos: [logo1, logo2],
    updatedAt: new Date().toISOString(),
  }
}

/**
 * Generate 8 demo POIs with placeholder images and stories
 */
export async function generateDemoPOIs(): Promise<POIRecord[]> {
  const colors = [
    '#3a9b8e', // teal
    '#4a5568', // grey
    '#2c5282', // blue
    '#744210', // brown
    '#276749', // green
    '#97266d', // purple
    '#975a16', // orange
    '#1a202c', // dark
  ]

  const poiNames = [
    'Bronze Age Burnt Mound',
    'Medieval Parish Church',
    'St. Brigid\'s Holy Well',
    'Victorian Estate Gates',
    'Stone Bridge',
    'Vernacular Cottage',
    'Penal Mass Rock',
    'Historic Lime Kiln',
  ]

  const pois: POIRecord[] = []

  for (let i = 0; i < 8; i++) {
    const photo = await createPlaceholderImage(
      `POI ${i + 1}`,
      colors[i],
      600,
      800
    )
    const thumbnail = await createPlaceholderImage(
      `${i + 1}`,
      colors[i],
      200,
      200
    )

    pois.push({
      id: `demo-poi-${i + 1}`,
      trailId: 'demo',
      groupCode: 'demo',
      trailType: 'graveyard',
      sequence: i + 1,
      filename: `demo-${i + 1}.jpg`,
      photoBlob: photo,
      thumbnailBlob: thumbnail,
      latitude: 52.0 + (i * 0.01), // Fake coordinates
      longitude: -7.0 - (i * 0.01),
      accuracy: 10,
      capturedAt: new Date().toISOString(),
      siteName: poiNames[i],
      category: 'Historic Feature',
      description: '',
      story: sampleStories[i],
      url: `https://example.com/poi-${i + 1}`,
      condition: 'Good',
      notes: '',
      completed: true,
    })
  }

  return pois
}

/**
 * Generate demo trail data
 */
export function generateDemoTrail() {
  return {
    id: 'demo-trail',
    groupCode: 'demo',
    trailType: 'graveyard' as const,
    displayName: 'Demo Graveyard Trail',
    createdAt: new Date().toISOString(),
    nextSequence: 9,
  }
}
