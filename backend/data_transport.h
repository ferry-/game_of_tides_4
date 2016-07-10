// Copyright 2016 duncan law (mrdunk@gmail.com)

#ifndef BACKEND_DATA_TRANSPORT_H_
#define BACKEND_DATA_TRANSPORT_H_

#include <stdint.h>   // uint32_t, uint64_t
#include <functional>  // std::bind
#include <string>
#include <iostream>  // cout

#include "backend/logging.h"

template <class Data> class DataExchange;

/* Transfer one data type to another for transmision or after receiving it.
 *
 * Plain: The type of the data to be sent before encoding
 *  or after it is received but before decoding.
 * Encoded: The type of data received before decoding
 *  or after encoding before it is send.
 */
template <class Plain, class Encoded>
class EncoderBase {
 public:
  virtual int Encode(Plain const& in, Encoded* out) = 0;
  virtual int Decode(Encoded const& in, Plain* out) = 0;
};

/* Dummy encoder just passes strings straight through with no modification. */
class EncoderPassString : public EncoderBase<std::string, std::string> {
 public:
  int Encode(std::string const& in, std::string* out) {
    *out = in;
    return !out->empty();
  }
  int Decode(std::string const& in, std::string* out) {
    *out = in;
    return !out->empty();
  }
};

/* A base class for sending data between logical components.
 * These may be on the same machine or networked.
 *
 * Input: The type of data expected to be sent.
 */
template <class Input>
class TransportBase {
 public:
  int Send(uint32_t address, int type, std::string data);
  void RegisterCallback(std::function<void(Input)> exchange) {
    consumer_ = exchange;
  }

 protected:
  void OnReceive(Input data);

 private:
  std::function<void(Input)> consumer_;
};

template <class Input>
void TransportBase<Input>::OnReceive(Input data) {
  if (consumer_) {
    consumer_(data);
  } else {
    LOG("Unconsumed data: " << data);
  }
}

class WorkHandlerBase {
 public:
  virtual void Consume(const std::string& data) = 0;
};

/* Plums a Transport layer to an encoder/decoder and an end consumer/provider of
 * the data to be sent/received.
 * eg: [user_method] -> [encode_the_data] -> [transport_layer]
 * eg: [transport_layer] -> [decode_the_data] -> [user_method]
 */
template <class Data>
class DataExchange {
 public:
  DataExchange() : p_work_handler_(NULL) {}

  void RegisterTransport(TransportBase<Data>* p_transporter) {
    p_transporter_ = p_transporter;
    p_transporter->RegisterCallback(
        std::bind(&DataExchange::OnReceive, this, std::placeholders::_1));
  }
  void RegisterEncoder(EncoderBase<Data, std::string>* p_encoder) {
    p_encoder_ = p_encoder;
  }

  void RegisterWorkHandler(WorkHandlerBase* p_work_handler) {
    p_work_handler_ = p_work_handler;
  }

  int Send(uint32_t address, int type, Data data) {
    std::string encoded;
    p_encoder_->Encode(data, encoded);
    return p_transporter_->Send(address, type, encoded);
  }

  void OnReceive(Data data) {
    LOG("Received: " << data);
    std::string out;
    if (p_encoder_->Decode(data, &out)) {
      LOG("decoded: " << out);
      if (p_work_handler_) {
        p_work_handler_->Consume(out);
      } else {
        LOG("unconsumed data: " << out);
      }
    }
  }

 private:
  TransportBase<Data>* p_transporter_;
  EncoderBase<Data, std::string>* p_encoder_;
  WorkHandlerBase* p_work_handler_;
};

#endif  // BACKEND_DATA_TRANSPORT_H_
