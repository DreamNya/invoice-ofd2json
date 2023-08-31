interface JSZipInputType {
    base64: string;
    string: string;
    text: string;
    binarystring: string;
    array: number[];
    uint8array: Uint8Array;
    arraybuffer: ArrayBuffer;
    blob: Blob;
    stream: ReadableStream;
}

type JSZipInputFileFormat = JSZipInputType[keyof JSZipInputType] | Promise<JSZipInputType[keyof JSZipInputType]>;

/**
 * 解析输入的ofd文件内容并将其转换为json输出
 * @param ofd 任意符合JSZip输入格式的ofd文件格式
 * @param logMessage 用于调试输出时附带的信息
 * @return json格式的解析后的ofd内容
 */
export function ofd2json(ofd: JSZipInputFileFormat, logMessage?: string): Promise<{ [key: string]: string }>;
