import React, { useEffect, useState } from 'react'
import { View, Text, Image, Button } from 'react-native'
import * as tf from '@tensorflow/tfjs'
import { decodeJpeg } from '@tensorflow/tfjs-react-native'
import * as mobilenet from '@tensorflow-models/mobilenet'
import * as cocossd from '@tensorflow-models/coco-ssd'
import * as ImagePicker from 'expo-image-picker'
import * as FileSystem from 'expo-file-system'
import * as jpeg from 'jpeg-js'

const App = () => {
  const [isTfReady, setIsTfReady] = useState(false)
  const [result, setResult] = useState('')
  const [pickedImage, setPickedImage] = useState('')
  const [loading, setLoading] = useState(false)

  const pickImage = async () => {
    setLoading(true)
    try {
      // No permissions request is necessary for launching the image library
      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      })
      if (!result.cancelled) {
        setPickedImage(result.uri)
      }
    } catch (error) {
    } finally {
      setLoading(false)
    }
  }
  const classifyUsingMobilenet = async () => {
    try {
      // Load mobilenet.
      await tf.ready()
      const model = await mobilenet.load()
      setIsTfReady(true)
      console.log('starting inference with picked image: ' + pickedImage)

      // Convert image to tensor
      const imgB64 = await FileSystem.readAsStringAsync(pickedImage, {
        encoding: FileSystem.EncodingType.Base64,
      })
      const imgBuffer = tf.util.encodeString(imgB64, 'base64').buffer
      const raw = new Uint8Array(imgBuffer)
      const imageTensor = decodeJpeg(raw)
      // Classify the tensor and show the result
      const prediction = await model.classify(imageTensor)
      if (prediction && prediction.length > 0) {
        setResult(
          `${prediction[0].className} (${prediction[0].probability.toFixed(
            3,
          )})`,
        )
      }
    } catch (err) {
      console.log(err)
    }
  }
  const classifyUsingCocoSSD = async () => {
    try {
      // Load Coco-SSD.
      setLoading(true)
      await tf.ready()
      const model = await cocossd.load()
      setIsTfReady(true)
      console.log('starting inference with picked image: ' + pickedImage)
      // Convert image to tensor
      const imgB64 = await FileSystem.readAsStringAsync(pickedImage, {
        encoding: FileSystem.EncodingType.Base64,
      })
      const imgBuffer = tf.util.encodeString(imgB64, 'base64').buffer
      const raw = new Uint8Array(imgBuffer)
      const TO_UINT8ARRAY = true
      const { width, height, data } = jpeg.decode(raw, TO_UINT8ARRAY)
      const buffer = new Uint8Array(width * height * 3)
      let offset = 0
      for (let i = 0; i < buffer.length; i += 3) {
        buffer[i] = data[offset]
        buffer[i + 1] = data[offset + 1]
        buffer[i + 2] = data[offset + 2]
        offset += 4
      }
      const imageTensor = tf.tensor3d(buffer, [height, width, 3])
      // Classify the tensor and show the result
      const prediction = await model.detect(imageTensor)
      if (prediction && prediction.length > 0) {
        setResult(`${prediction[0].class} (${prediction[0].score.toFixed(3)}`)
      }
    } catch (err) {
      console.log(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    classifyUsingCocoSSD()
  }, [pickedImage])

  return (
    <View
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Image
        source={{ uri: pickedImage }}
        style={{ width: 200, height: 200, margin: 40 }}
      />
      {isTfReady && <Button title='Escolha uma imagem' onPress={pickImage} />}

      <View style={{ width: '100%', height: 20 }} />
      {!isTfReady && <Text>Carregando modelo do TensorFlow Lite...</Text>}
      {isTfReady && result === '' && (
        <Text>Escolha uma imagem para classificar!</Text>
      )}

      {loading && <Text>Carregando...</Text>}

      {result !== '' && <Text>{result}</Text>}
    </View>
  )
}
export default App
