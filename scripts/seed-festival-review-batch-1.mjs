import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import pg from "pg";
import sharp from "sharp";

const required=["DATABASE_URL","AWS_REGION","AWS_ACCESS_KEY_ID","AWS_SECRET_ACCESS_KEY","AWS_S3_BUCKET"];
const missing=required.filter(name=>!process.env[name]?.trim());
if(missing.length)throw new Error(`Missing runtime configuration: ${missing.join(", ")}`);
const root=path.resolve("private-assets/festival-review-batch-1");
const manifestBuffer=await readFile(path.join(root,"manifest.json"));
const manifest=JSON.parse(manifestBuffer.toString("utf8"));
if(manifest.total!==120||manifest.approved!==0||manifest.state!=="visual_review_required")throw new Error("Batch 1 manifest safety check failed.");
const manifestChecksum=createHash("sha256").update(manifestBuffer).digest("hex");
const prefix=(process.env.AWS_S3_PRIVATE_PREFIX||"private").replace(/^\/+|\/+$/g,"");
const s3=new S3Client({region:process.env.AWS_REGION,credentials:{accessKeyId:process.env.AWS_ACCESS_KEY_ID,secretAccessKey:process.env.AWS_SECRET_ACCESS_KEY,sessionToken:process.env.AWS_SESSION_TOKEN||undefined}});
const database=new pg.Client({connectionString:process.env.DATABASE_URL,ssl:process.env.DATABASE_SSL==="require"?{rejectUnauthorized:false}:undefined});
await database.connect();
try{
  await database.query("begin");
  const batch=await database.query(`insert into festival_asset_review_batches(stable_key,display_name,status,manifest_checksum_sha256,total_items) values('festival-review-batch-1','Festival Asset Library - Batch 1','visual_review_required',$1,120) on conflict(stable_key) do update set manifest_checksum_sha256=excluded.manifest_checksum_sha256,total_items=excluded.total_items,updated_at=now() returning id`,[manifestChecksum]);
  const batchId=batch.rows[0].id;
  for(const asset of manifest.assets){
    const source=await readFile(path.join(root,asset.relativePath));
    const actual=createHash("sha256").update(source).digest("hex");
    if(actual!==asset.checksumSha256)throw new Error(`Checksum mismatch: ${asset.stable_asset_id||asset.id}`);
    const thumbnail=await sharp(source,{density:120}).resize({width:480,height:320,fit:"contain",background:{r:248,g:247,b:252,alpha:1}}).webp({quality:82}).toBuffer();
    const sourceKey=`${prefix}/writex/holiday/review/festival-review-batch-1/${asset.id}.svg`;
    const thumbKey=`${prefix}/writex/holiday/review/festival-review-batch-1/thumbnails/${asset.id}.webp`;
    await s3.send(new PutObjectCommand({Bucket:process.env.AWS_S3_BUCKET,Key:sourceKey,Body:source,ContentType:"image/svg+xml",ServerSideEncryption:"AES256",Metadata:{reviewstate:"visual-review-required",batch:"festival-review-batch-1"}}));
    await s3.send(new PutObjectCommand({Bucket:process.env.AWS_S3_BUCKET,Key:thumbKey,Body:thumbnail,ContentType:"image/webp",ServerSideEncryption:"AES256",Metadata:{reviewstate:"visual-review-required",batch:"festival-review-batch-1"}}));
    await database.query(`insert into festival_asset_review_items(batch_id,stable_asset_id,display_name,festival_slug,festival_name,category,subcategory,source_s3_key,thumbnail_s3_key,checksum_sha256,mime_type,width,height,metadata_json,review_state) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'image/svg+xml',$11,$12,$13::jsonb,'visual_review_required') on conflict(batch_id,stable_asset_id) do update set display_name=excluded.display_name,thumbnail_s3_key=excluded.thumbnail_s3_key,metadata_json=excluded.metadata_json,updated_at=now()`,[batchId,asset.id,asset.name,asset.festivalSlug,asset.festivalName,asset.category,asset.subcategory,sourceKey,thumbKey,actual,asset.dimensions.width,asset.dimensions.height,JSON.stringify({...asset,fileSize:source.length})]);
  }
  const count=await database.query("select count(*)::int count from festival_asset_review_items where batch_id=$1",[batchId]);
  if(count.rows[0].count!==120)throw new Error(`Expected 120 seeded review items, found ${count.rows[0].count}.`);
  const approved=await database.query("select count(*)::int count from festival_asset_review_items where batch_id=$1 and review_state='approved'",[batchId]);
  if(approved.rows[0].count!==0)throw new Error("Seed operation cannot overwrite an existing Founder decision.");
  await database.query("commit");
  console.log(JSON.stringify({batchId,total:120,approved:0,state:"visual_review_required"}));
}catch(error){await database.query("rollback");throw error}finally{await database.end()}
