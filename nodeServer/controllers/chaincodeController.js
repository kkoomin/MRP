const dotenv = require("dotenv")
const fs = require("fs")
const FabricCAServices = require("fabric-ca-client")
const { FileSystemWallet, X509WalletMixin, Gateway } = require("fabric-network")
const os = require("os")
const path = require("path")

const Medicine = require("../models").Medicine
const Barcode = require("../models").Barcode
const Temp = require("../models").Temp

const env = process.env

// 소속 식별을 위한 변수들
let connectionConfig = "connection-org1.json"
let companyMSP = ""
let companyAffiliation = ""

const ccpPath = path.resolve(__dirname, "..", `${env.NETWORK_CONFIG}`, `${connectionConfig}`)
const ccpJSON = fs.readFileSync(ccpPath, "utf8")
const ccp = JSON.parse(ccpJSON)

// 인증기관과 통신할 수 있는 객체 생성
const caURL = ccp.certificateAuthorities[`${env.CA}`].url
const ca = new FabricCAServices(caURL)

// 신원 증명서를 저장할 wallet 생성
const walletPath = path.join(os.homedir(), "wallet")
// const walletPath = path.join(process.cwd(), "wallet")
const wallet = new FileSystemWallet(walletPath)

// 체인코드
const chainCode = `${env.CHAINCODE_NAME}`

// 채널
const channel = `${env.CHANNEL_NAME}`

dotenv.config()
// ==================  GET Method ==================
// 1. MRP 블록체인 네트워크 연결 시도

// 소속 식별 변수들 주입
const IdentifyOrg = (companyType) => {
  return new Promise((resolve, reject) => {
    switch (companyType) {
      case "oversee":
        ;(connectionConfig = "connection-org1.json"),
          (companyMSP = "Org1MSP"),
          (companyAffiliation = "org1.department1")

        resolve()
        break
      case "manufacturer":
        ;(connectionConfig = "connection-org2.json"),
          (companyMSP = "Org2MSP"),
          (companyAffiliation = "org2.department1")
        resolve()
        break
      case "distributor":
        ;(connectionConfig = "connection-org3.json"),
          (companyMSP = "Org3MSP"),
          (companyAffiliation = "org3.department1")
        resolve()
        break
      case "hospital":
        ;(connectionConfig = "connection-org4.json"),
          (companyMSP = "Org4MSP"),
          (companyAffiliation = "org4.department1")
        resolve()
        break
      default:
        ;(connectionConfig = "connection-org4.json"),
          (companyMSP = "Org4MSP"),
          (companyAffiliation = "org4.department1")
        resolve()
    }
  })
}

const connect = async (req, res) => {
  //const companyType = req.session.companyType
  const companyType = "oversee"
  await IdentifyOrg(companyType)
  console.log(connectionConfig)
  try {
    console.log(`Wallet path: ${walletPath}`)
    // Check to see if we've already enrolled the admin user.
    const adminExists = await wallet.exists("admin")
    if (!adminExists) {
      // Enroll the admin user, and import the new identity into the wallet.
      const enrollment = await ca.enroll({
        enrollmentID: `${env.ENROLLMENT_ID}`,
        enrollmentSecret: `${env.ENROLLMENT_SECRET}`,
      })
      const identity = X509WalletMixin.createIdentity(
        companyMSP, // session vriable
        enrollment.certificate,
        enrollment.key.toBytes()
      )
      await wallet.import("admin", identity)
      console.log('Successfully enrolled admin user "admin" and imported it into the wallet')
    }

    // Check to see if we've already enrolled the user.
    const userExists = await wallet.exists(companyType) // session company type
    if (!userExists) {
      // Create a new gateway for connecting to our peer node.
      const gateway = new Gateway()
      await gateway.connect(ccp, {
        wallet,
        identity: "admin",
        discovery: { enabled: false },
      })

      // Get the CA client object from the gateway for interacting with the CA.
      const ca = gateway.getClient().getCertificateAuthority()
      const adminIdentity = gateway.getCurrentIdentity()

      // Register the user, enroll the user, and import the new identity into the wallet.
      const secret = await ca.register(
        {
          affiliation: companyAffiliation, // session vriable
          enrollmentID: companyType, // session companyType
          role: "client", //
        },
        adminIdentity
      )
      const enrollment = await ca.enroll({
        enrollmentID: companyType, // session companyType
        enrollmentSecret: secret,
      })
      const userIdentity = X509WalletMixin.createIdentity(
        companyMSP, // session MSP
        enrollment.certificate,
        enrollment.key.toBytes()
      )
      await wallet.import(companyType, userIdentity)
      console.log(
        `Successfully registered and enrolled admin user ${companyType} and imported it into the wallet`
      )
    }
    res.json({ message: true })
  } catch (err) {
    console.log(err)
  }
}

// ==================  POST Method ==================

const insertBarcodeInfo = async (barcode) => {
  const mediCode = barcode.substring(4, 17)
  try {
    const veryifyMediCode = await Medicine.findOne({
      where: { mediCode },
    })
    if (!veryifyMediCode) {
      return false
    } else {
      try {
        const insertBarcode = await Barcode.create({
          barcodeName: barcode,
          mediCode,
        })
        return true
      } catch (err) {
        //console.log(err)
        return false
      }
    }
  } catch (err) {
    //console.log(err)
    return false
  }
}

const insertBlockchainData = async (tempData, companyType) => {
  const stringTempData = JSON.stringify(tempData)
  try {
    const userExists = await wallet.exists(companyType)
    if (!userExists) {
      console.log(`An identity for the user ${companyType} does not exist in the wallet`)
      return false
    }
    console.log("Start : Update Medicine Info")
    // Create a new gateway for connecting to our peer node.
    const gateway = new Gateway()
    await gateway.connect(ccp, {
      wallet,
      identity: companyType,
      discovery: { enabled: false },
    })
    // Get the network (channel) our contract is deployed to.
    const network = await gateway.getNetwork(channel)

    // Get the contract from the network.
    const contract = network.getContract(chainCode)

    // Evaluate the specified transaction
    const UpdateResult = await contract.submitTransaction("changeMediStatus", stringTempData)
    if (UpdateResult.toString() == "true") {
      console.log(`Transaction has been evaluated, result is ok`)
    } else {
      console.log("Transaction faile")
    }
    return true
  } catch (err) {
    console.log(err)
    return false
  }
}

// 2. 전문의약품 유통정보 등록 (도매, 병원 및 약국)
const update = async (req, res) => {
//  const companyType = req.session.companyType
  const companyType = "oversee"
  try {
    const tempData = await Temp.findAll({
      attributes: ["barcode", "companyCode", "targetCompanyCode", "state", "description"],
    })
    // console.log(tempData)
    let index = 0
    console.log("===============================================================================");
    console.log("temp data:" + tempData[0]);
    while (index < tempData.length) {
      let varify = await insertBarcodeInfo(tempData[index].dataValues.barcode)
      if (varify) {
        index++
      } else {
        tempData.splice(index, 1)
      }
    }
    //tempData.forEach((element) => {await insertBarcodeInfo(element.barcode)})
    console.log("block : " + tempData);
    const result = await insertBlockchainData(tempData, companyType)
    if (result) {
      res.json({ message: true })
    } else {
      res.json({ message: false })
    }
  } catch (err) {
    console.log(err)
    res.json({ message: false })
  }
}

// 3. 단일 전문의약품의 현재 유통정보를 확인 (world state)
// front-end에서 barcode 1개를 인자로 전달
const getBarcode = async (req, res) => {
  const companyType = req.session.companyType
  //console.log(req.body.barcode)
  try {
    const userExists = await wallet.exists(companyType)
    if (!userExists) {
      console.log(`An identity for the user ${companyType} does not exist in the wallet`)
      await res.json({ msg: "연결부터 해주세요" })
      return
    }

    // Create a new gateway for connecting to our peer node.
    const gateway = new Gateway()
    await gateway.connect(ccp, {
      wallet,
      identity: userWalletID,
      discovery: { enabled: false },
    })

    // Get the network (channel) our contract is deployed to.
    const network = await gateway.getNetwork(channel)

    // Get the contract from the network.
    const contract = network.getContract(chainCode)

    const result = await contract.evaluateTransaction("getBarcode", `${req.body.barcode}`)
    const state = JSON.parse(result)
    console.log(result)
    res.json({ state })
  } catch (err) {
    console.log(err)
  }
}

// 4. 표준코드에 대응하는 모든 바코드 항목을 조회
// front-end에서 mediCode(표준코드) 1개를 인자로 전달
const barcodeList = async (req, res) => {
  const companyType = req.session.companyType
  try {
    const userExists = await wallet.exists(companyType)
    if (!userExists) {
      console.log(`An identity for the user ${companyType} does not exist in the wallet`)
      await res.json({ msg: "연결부터 해주세요" })
      return
    }

    let resultState
    const arr = []
    const barcodeList = await Barcode.findAll({
      attributes: ["barcodeName", "mediCode"],
      where: {
        mediCode: req.body.mediCode,
      },
    })
    // 대응되는 바코드 개수 (size) //forEach
    const size = Object.keys(barcodeList).length
    for (let i = 0; i < size; i++) {
      console.log("barcord " + i + ":" + barcodeList[i].barcodeName)
      arr.push(barcodeList[i].barcodeName)
      console.log(barcodeList[i].barcodeName)
    }
    // 콜백함수 (블록체인 네트워크에 바코드별 최신 유통정보 조회)
    showBarcodes(arr)
    res.json({ resultState })
  } catch (err) {
    console.log(err)
  }
}

// 5. 각 바코드의 현재 유통상태 조회 (world state)
// ??? 에서 [barcode1,barcode2,...,]를 인자로 전달
const showBarcodes = async (arr) => {
  try {
    const mediCode = arr // 바코드 배열
    console.log(mediCode)
    console.log(mediCode.toString())

    const gateway = new Gateway()
    await gateway.connect(ccp, {
      wallet,
      identity: userWalletID,
      discovery: { enabled: false },
    })
    // Get the network (channel) our contract is deployed to.
    const network = await gateway.getNetwork(channel)

    // Get the contract from the network.
    const contract = network.getContract(chainCode)

    const result = await contract.evaluateTransaction("getAllBarcode", mediCode.toString())
    console.log(result)
    const state = JSON.parse(result)
    resultState = state
  } catch (err) {
    console.log(err)
  } finally {
    resultState = "fail"
  }
}

// 6. 특정 전문의약품의 유통 히스토리를 조회
// front-end에서 barcode 인자(1개) 전달
const history = async (req, res) => {
  const companyType = req.session.companyType
  try {
    const userExists = await wallet.exists(companyType)
    if (!userExists) {
      console.log(`An identity for the user ${companyType} does not exist in the wallet`)
      await res.json({ msg: "연결부터 해주세요" })
      return
    }

    // Create a new gateway for connecting to our peer node.
    const gateway = new Gateway()
    await gateway.connect(ccp, {
      wallet,
      identity: userWalletID,
      discovery: { enabled: false },
    })

    // Get the network (channel) our contract is deployed to.
    const network = await gateway.getNetwork(channel)

    // Get the contract from the network.
    const contract = network.getContract(chainCode)

    const result = await contract.evaluateTransaction(
      "getHistoryForMedicine",
      `${req.body.barcode}`
    )
    const history = JSON.parse(result)
    res.json({ history })
  } catch (err) {
    console.log(err)
  }
}

module.exports = { connect, update, getBarcode, history, barcodeList }
