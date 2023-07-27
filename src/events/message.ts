import { event, Events } from "../utils/index.js";
import { createCanvas, registerFont, Image, loadImage } from "canvas";
import { fillTextWithEmoji } from "../utils/fillEmoji.js"
import axios from "axios";


const TEXT_COLOR = "#ffffff";
const BACKGROUND_COLOR = "#36393f";

const X_GAP = 15;
const Y_GAP = 5;

const AVATAR_SIZE = 40;
const TEXT_SIZE = 15;
const SCALE = 1;

const MAX_CHARACTERS_PER_LINE = 100;

const FRAME_GAP = 30;

registerFont("./font/gg_sans_Normal.ttf", { family: "gg-normal" });
registerFont("./font/gg_sans_Bold.ttf" ,  { family: "gg-bold"   });

export default event(Events.MessageCreate, async ({log}, message) => {


    let client = message.client;
    if (!message.mentions.has(client.user)) return;
    if (message.author.id == client.user.id) return;
    if (!message.member) return;



    if(!message.reference){

        return message.reply("I'm not sure what you want me to frame. Ping me while replying to a message to frame it!")

    }

    let ref = await message.fetchReference();

    if(!ref.author){
        return message.reply("I'm sorry, but I can't read this message.")
    }

    let member = await ref.guild?.members.fetch(ref.author.id);

    if(!member) return;

    // Get title, content, avatarURL, and role color
    let messageData = {

        nickname: member.displayName,
        color: member.displayHexColor || "#ffffff",
        content: ref.content,
        attachment: ref.attachments.size > 0 ? ref.attachments.at(0) : null,
        avatar: member.displayAvatarURL({ extension: "png", size: 128 }).replace(".gif",".png")

    }

    console.log(messageData.attachment);

    let corner1 = await loadImage("img/frame/Corner1.png");
    let corner2 = await loadImage("img/frame/Corner2.png");
    let corner3 = await loadImage("img/frame/Corner3.png");
    let corner4 = await loadImage("img/frame/Corner4.png");

    let frameTop = await loadImage("img/frame/FrameTop.png");
    let frameLeft = await loadImage("img/frame/FrameLeft.png");
    let frameRight = await loadImage("img/frame/FrameRight.png");
    let frameBottom = await loadImage("img/frame/FrameBottom.png");


    let lineData = getLines(messageData.content);

    // CALCULATE WIDTH AND HEIGHT

    var TOP_X = 0;
    var TOP_Y = 0;

    let xPad = SCALE * (AVATAR_SIZE + X_GAP);

    let widthFromLongestLine = Math.max(150, xPad + (messageData.attachment?.width || 0) + FRAME_GAP, xPad + (Math.max(lineData.longest, messageData.nickname.length) * 6) + FRAME_GAP) * SCALE;
    let heightFromLineCount = (lineData.lines.length * (TEXT_SIZE + 1) + (50) + (messageData.attachment?.height || 0)) * SCALE;

    let xSections = Math.ceil(widthFromLongestLine / frameTop.width);
    let ySections = Math.ceil(heightFromLineCount / frameLeft.height);

    TOP_X = frameTop.height + FRAME_GAP;
    TOP_Y = frameLeft.width + FRAME_GAP;

    let width = (corner1.width * 2) + (xSections * frameTop.width);
    let height = (corner1.height * 2) + (ySections * frameLeft.height);


    






    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = BACKGROUND_COLOR;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if(messageData.color == "#000000") messageData.color = "#ffffff";

    // AVATAR

    

    

    // DRAW THE FOUR CORNERS
    ctx.drawImage(corner1, 0, 0);
    ctx.drawImage(corner2, canvas.width - corner2.width, 0);
    ctx.drawImage(corner3, 0, canvas.height - corner3.height);
    ctx.drawImage(corner4, canvas.width - corner4.width, canvas.height - corner4.height);

    for(var x = 0; x < xSections; x++){
        let currX = corner1.width + (x * frameTop.width);

        ctx.drawImage(frameTop, currX, 0);
        ctx.drawImage(frameBottom, currX, canvas.height - frameBottom.height);
    }
    for(var y = 0; y < ySections; y++){
        let currY = corner1.height + (y * frameLeft.height);

        ctx.drawImage(frameLeft, 0, currY);
        ctx.drawImage(frameRight, canvas.width - frameRight.width, currY);
    }

    


    
    


    // THE TITLE
    ctx.font = `${TEXT_SIZE * SCALE}px "gg-normal"`;
    ctx.fillStyle = messageData.color;
    await fillTextWithEmoji(ctx, messageData.nickname, xPad + TOP_X, TOP_Y + SCALE * (Y_GAP + TEXT_SIZE/2));


    

    let bottomY = 0;

    for(var i = 0; i < lineData.lines.length; i++){

        bottomY = TOP_Y + SCALE * (Y_GAP + TEXT_SIZE * 1.5 + Y_GAP + ((TEXT_SIZE*1.1) * i));
        ctx.fillStyle = "#ffffff";
        await fillTextWithEmoji(ctx, lineData.lines[i], xPad + TOP_X, bottomY);

    }


    // circle for the image
    


    

    let buffer = await requestImageFromURL(messageData.avatar);

    if(messageData.attachment){
        let attachmentImg = new Image;

        let attBuffer = await requestImageFromURL(messageData.attachment.url);

        attachmentImg.onload = function(){

            ctx.drawImage(attachmentImg, TOP_X + xPad, bottomY + (Y_GAP*2 * SCALE), SCALE * attachmentImg.width, SCALE * attachmentImg.height);

            finalize();
        }
        attachmentImg.src = attBuffer;

    } else {
        finalize();
    }

    async function finalize(){

        const circle = {
            x: TOP_X + SCALE * (AVATAR_SIZE / 2),
            y: TOP_Y + SCALE * (AVATAR_SIZE / 2),
            radius: SCALE * (AVATAR_SIZE / 2),
        }
        ctx.beginPath();
        ctx.arc(circle.x, circle.y, circle.radius, 0, Math.PI * 2, true);
        ctx.closePath();
        ctx.clip();
        
        var img = new Image;
        img.onload = function(){
            const aspect = img.height / img.width;
            const hsx = circle.radius * Math.max(1.0 / aspect, 1.0);
            const hsy = circle.radius * Math.max(aspect, 1.0);

            ctx.drawImage(img, circle.x - hsx, circle.y - hsy, hsx * 2, hsy * 2);


            console.log("loaded!");

            let attachment = Buffer.from(canvas.toDataURL().split(",")[1], "base64");

            message.reply({ files: [
                {
                    attachment: attachment,
                    name: "frame.png"
                }
            ] })
    }

    img.src = buffer;
    }

    


    return true;
});

async function requestImageFromURL(url: any){
    let response = await axios.get(url, { responseType:"arraybuffer" })
    return Buffer.from(response.data, "base64");
}


function trimLine(lines: string[]){

    if(!lines) return false;

    if (lines[0].length <= MAX_CHARACTERS_PER_LINE) return lines.reverse();

    let line = lines[0];

    let start = Math.min(MAX_CHARACTERS_PER_LINE, line.length);
    let index = -1;

    for(var i = start; i >= 0; i--){
        var char = line[i];
        if (char == " ") {
            // we've got it
            index = i;
            break;
        }
    }

    if (index == -1) index = 100;

    lines[0] = line.slice(0, index);
    lines.unshift(line.slice(index+1));

    console.log("LINES", lines);

    return trimLine(lines);

}

function getLines(message: string){
    var longest = -1;
    var lines = [];


    for(var m of message.split("\n")){


        let parts = trimLine([m]);

        if(!parts) continue;

        for(var part of parts){

            if(part.length > longest) longest = part.length;
            lines.push(part);


        }
    
    }

    return {
        longest: longest,
        lines: lines
    }
}

function clamp(x: number, min: number, max: number){

    return x >= max ? max : (x <= min ? min : x);

}