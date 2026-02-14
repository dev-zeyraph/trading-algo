#pragma once

#include <chrono>
#include <fstream>
#include <mutex>
#include <string>

namespace QuantKernel {

class Tracer {
public:
  static Tracer &instance() {
    static Tracer instance;
    return instance;
  }

  void begin_event(const std::string &name,
                   const std::string &category = "kernel") {
    auto now = std::chrono::high_resolution_clock::now();
    auto ts = std::chrono::duration_cast<std::chrono::microseconds>(
                  now.time_since_epoch())
                  .count();
    log_event(name, category, "B", ts);
  }

  void end_event(const std::string &name,
                 const std::string &category = "kernel") {
    auto now = std::chrono::high_resolution_clock::now();
    auto ts = std::chrono::duration_cast<std::chrono::microseconds>(
                  now.time_since_epoch())
                  .count();
    log_event(name, category, "E", ts);
  }

  void enable(const std::string &filename) {
    std::lock_guard<std::mutex> lock(mutex_);
    file_.open(filename);
    file_ << "[";
    first_event_ = true;
  }

  void flush() {
    std::lock_guard<std::mutex> lock(mutex_);
    if (file_.is_open())
      file_.flush();
  }

private:
  Tracer() = default;
  ~Tracer() {
    if (file_.is_open()) {
      file_ << "]";
      file_.close();
    }
  }

  void log_event(const std::string &name, const std::string &category,
                 const std::string &ph, long long ts) {
    std::lock_guard<std::mutex> lock(mutex_);
    if (!file_.is_open())
      return;

    if (!first_event_)
      file_ << ",";
    first_event_ = false;

    file_ << "{\"name\":\"" << name << "\",\"cat\":\"" << category
          << "\",\"ph\":\"" << ph << "\",\"ts\":" << ts
          << ",\"pid\":1,\"tid\":1}";
  }

  std::ofstream file_;
  std::mutex mutex_;
  bool first_event_ = true;
};

// RAII Helper
class TraceScope {
  std::string name_;

public:
  TraceScope(const std::string &name) : name_(name) {
    Tracer::instance().begin_event(name_);
  }
  ~TraceScope() { Tracer::instance().end_event(name_); }
};

} // namespace QuantKernel

extern "C" {
void enable_tracing(const char *filename) {
  QuantKernel::Tracer::instance().enable(filename);
}
}
