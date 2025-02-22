import { useEffect, useRef } from "react";
import { mat4 } from 'gl-matrix';
import fragment_shader from '../shader/fragment.glsl';
import vertex_shader from '../shader/vertex.glsl';
import calculateNormals from "../lib/calculateNormals";

const Canvas = () => {
    let gl: WebGL2RenderingContext,
        program: WebGLProgram,
        geometryVertexBuffer: WebGLBuffer | null,
        geometryIndexBuffer: WebGLBuffer | null,
        geometryVAO: WebGLVertexArrayObject | null,
        indices: Array<number>,
        shininess = 10,
        lightColor = [1, 1, 1, 1],
        lightAmbient = [0.03, 0.03, 0.03, 1],
        lightSpecular = [1, 1, 1, 1],
        lightDirection = [-0.25, -0.25, -0.25],
        materialDiffuse = [46 / 256, 99 / 256, 191 / 256, 1],
        materialAmbient = [1, 1, 1, 1],
        materialSpecular = [1, 1, 1, 1],
        cameraMatrix = mat4.create(),
        modelViewMatrix = mat4.create(),
        projectionMatrix = mat4.create(),
        normalMatrix = mat4.create();

    const canvasRef = useRef(null);
    const getContext = () => {
        const canvas = canvasRef.current as unknown as HTMLCanvasElement;
        return canvas.getContext('webgl2');
    };

    //shaderの設定
    function initShader() {
        //vertex shader
        const vertexShader = gl.createShader(gl.VERTEX_SHADER) as WebGLShader;
        gl.shaderSource(vertexShader, vertex_shader);
        gl.compileShader(vertexShader);
        //fragment shader
        const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER) as WebGLShader;
        gl.shaderSource(fragmentShader, fragment_shader);
        gl.compileShader(fragmentShader);

        //program
        program = gl.createProgram() as WebGLProgram;
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);

        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            console.error('Could not initialize shader');
        }
        gl.useProgram(program);
        (program as any).aVertexPosition = gl.getAttribLocation(program, 'aVertexPosition');
        (program as any).aVertexNormal = gl.getAttribLocation(program, 'aVertexNormal');
        (program as any).uProjectionMatrix = gl.getUniformLocation(program, 'uProjectionMatrix');
        (program as any).uModelViewMatrix = gl.getUniformLocation(program, 'uModelViewMatrix');
        (program as any).uShininess = gl.getUniformLocation(program,'uShininess');
        (program as any).uNormalMatrix = gl.getUniformLocation(program, 'uNormalMatrix');
        (program as any).uMaterialAmbient = gl.getUniformLocation(program, 'uMaterialAmbient');
        (program as any).uMaterialDiffuse = gl.getUniformLocation(program, 'uMaterialDiffuse');
        (program as any).uMaterialSpecular = gl.getUniformLocation(program,'uMaterialSpecular');
        (program as any).uLightDirection = gl.getUniformLocation(program, 'uLightDirection');
        (program as any).uLightAmbient = gl.getUniformLocation(program, 'uLightAmbient');
        (program as any).uLightDiffuse = gl.getUniformLocation(program, 'uLightDiffuse');
        (program as any).uLightSpecular = gl.getUniformLocation(program, 'uLightSpecular');
    }
    function initLight() {
        gl.uniform4fv((program as any).uLightDiffuse, lightColor);
        gl.uniform4fv((program as any).uLightAmbient, lightAmbient);
        gl.uniform4fv((program as any).uLightSpecular, lightSpecular);
        gl.uniform3fv((program as any).uLightDirection, lightDirection);
        gl.uniform4fv((program as any).uMaterialDiffuse, materialDiffuse);
        gl.uniform4fv((program as any).uMaterialSpecular, materialSpecular);
        gl.uniform4fv((program as any).uMaterialAmbient, materialAmbient);
        gl.uniform1f((program as any).uShininess, shininess);
    }

    //ジオメトリ作成
    function initBuffer() {
        const vertices = [
            1.5, 0, 0,
            -1.5, 1, 0,
            -1.5, 0.809017, 0.587785,
            -1.5, 0.309017, 0.951057,
            -1.5, -0.309017, 0.951057,
            -1.5, -0.809017, 0.587785,
            -1.5, -1, 0,
            -1.5, -0.809017, -0.587785,
            -1.5, -0.309017, -0.951057,
            -1.5, 0.309017, -0.951057,
            -1.5, 0.809017, -0.587785
        ];

        indices = [
            0, 1, 2,
            0, 2, 3,
            0, 3, 4,
            0, 4, 5,
            0, 5, 6,
            0, 6, 7,
            0, 7, 8,
            0, 8, 9,
            0, 9, 10,
            0, 10, 1
        ];
        const normals = calculateNormals(vertices, indices);
        //VAO
        geometryVAO = gl.createVertexArray();
        gl.bindVertexArray(geometryVAO);
        //VBO
        geometryVertexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, geometryVertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
        //draw内で使用する為、VAOの命令を実行
        gl.enableVertexAttribArray((program as any).aVertexPosition);
        gl.vertexAttribPointer((program as any).aVertexPosition, 3, gl.FLOAT, false, 0, 0);
        //normals
        const geometryNormalsBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, geometryNormalsBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);
        gl.enableVertexAttribArray((program as any).aVertexNormal);
        gl.vertexAttribPointer((program as any).aVertexNormal, 3, gl.FLOAT, false, 0, 0);
        //IBO
        geometryIndexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, geometryIndexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
        //clean
        gl.bindVertexArray(null);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
    }
    //描写
    function draw() {
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

        //setup camera
        mat4.perspective(projectionMatrix, 45, gl.canvas.width / gl.canvas.height, 0.1, 10000);
        mat4.identity(modelViewMatrix);
        mat4.translate(modelViewMatrix, modelViewMatrix, [0, 0, -5]);
        gl.uniformMatrix4fv((program as any).uProjectionMatrix, false, projectionMatrix);
        gl.uniformMatrix4fv((program as any).uModelViewMatrix, false, modelViewMatrix);

        mat4.copy(normalMatrix, modelViewMatrix);
        mat4.invert(normalMatrix, normalMatrix);
        mat4.transpose(normalMatrix, normalMatrix);

        gl.uniformMatrix4fv((program as any).uNormalMatrix, false, normalMatrix);
        gl.uniformMatrix4fv((program as any).uModelViewMatrix, false, modelViewMatrix);
        gl.uniformMatrix4fv((program as any).uProjectionMatrix, false, projectionMatrix);

        //bind VAO, IBO
        gl.bindVertexArray(geometryVAO);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, geometryIndexBuffer);
        //描画
        gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);
        //clear
        gl.bindVertexArray(null);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
    }

    function configure() {
        gl = getContext() as WebGL2RenderingContext;
        gl.clearColor(0.9, 0.9, 0.9, 1);
        gl.clearDepth(100);
        gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(gl.LEQUAL);

        initShader();
        initBuffer();
        initLight();
        draw();
    }

    useEffect(() => {
        configure();
    }, []);
    return (
        <div>
            <canvas className='webgl-canvas' ref={canvasRef} width={1000} height={600}/>
        </div>
    )
}

export default Canvas;