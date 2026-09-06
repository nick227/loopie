import { db } from '@project/db'
db.houseAd
  .create({
    data: {
      name: 'POC WordPress Ad',
      type: 'WORDPRESS_EMBED',
      status: 'ACTIVE',
      weight: 1,
      scriptUrl:
        'https://hatsyshirtsy.com/wp-admin/admin-post.php?action=wp_advertising_embed_js&ver=8.1.0',
      placements: {
        create: { zone: 'HOUSE_AD' },
      },
    },
  })
  .then(() => console.log('POC ad created'))
  .catch(console.error)
  .finally(() => db.$disconnect())
